import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import websocket from '@fastify/websocket';
import argon2 from 'argon2';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma, AdminRole, AuditAction, DeliveryPolicy, ProductStatus, UserType } from '@burkina/db';

const app = Fastify({ logger: true });
const port = Number(process.env.API_PORT || 4000);
const origin = process.env.WEB_ORIGIN || 'http://localhost:3000';
const accessSecret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET || 'unsafe-dev-secret-change-me');
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'unsafe-refresh-secret-change-me');

await app.register(cors, { origin, credentials: true });
await app.register(helmet);
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
await app.register(sensible);
await app.register(websocket);

function sha256(input: string) { return crypto.createHash('sha256').update(input).digest('hex'); }
function randomCode() { return crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase(); }

async function signAccess(userId: string, role?: string | null) {
  return new SignJWT({ sub: userId, role: role ?? undefined, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('15m').sign(accessSecret);
}
async function signRefresh(userId: string) {
  return new SignJWT({ sub: userId, typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(refreshSecret);
}

async function auth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return reply.unauthorized('Authentication required');
  try {
    const token = header.slice(7);
    const { payload } = await jwtVerify(token, accessSecret);
    (request as any).userId = String(payload.sub);
    (request as any).role = payload.role ? String(payload.role) : null;
  } catch { return reply.unauthorized('Invalid or expired token'); }
}

async function adminOnly(request: FastifyRequest, reply: FastifyReply) {
  const result = await auth(request, reply); if (result) return result;
  const role = (request as any).role as AdminRole | null;
  if (!role) return reply.forbidden('Administrator role required');
}

async function audit(actorUserId: string | null, action: AuditAction, objectType: string, objectId?: string, before?: unknown, after?: unknown, request?: FastifyRequest, justification?: string) {
  await prisma.auditLog.create({ data: {
    actorUserId, action, objectType, objectId, before: before as any, after: after as any, justification,
    ip: request?.ip, userAgent: request?.headers['user-agent']
  }});
}

app.get('/health', async () => ({ status: 'ok', service: 'burkina-market-api', time: new Date().toISOString() }));

app.get('/v1/categories', async () => prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }));
app.get('/v1/products', async (request) => {
  const query = z.object({ q: z.string().optional(), category: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(24), cursor: z.string().optional() }).parse(request.query);
  return prisma.product.findMany({
    where: { status: ProductStatus.PUBLISHED, ...(query.category ? { category: { slug: query.category } } : {}), ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {}) },
    include: { shop: { select: { id: true, name: true, slug: true, verified: true } }, inventory: true, category: true },
    take: query.limit, ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}), orderBy: { createdAt: 'desc' }
  });
});

app.post('/v1/auth/register', async (request, reply) => {
  const body = z.object({ displayName: z.string().min(2).max(120), phone: z.string().min(6).max(30).optional(), email: z.string().email().optional(), password: z.string().min(10).optional(), type: z.nativeEnum(UserType).default(UserType.BUYER) }).parse(request.body);
  if (!body.phone && !body.email) return reply.badRequest('phone or email is required');
  if (body.email && !body.password) return reply.badRequest('password required for email registration');
  const exists = await prisma.user.findFirst({ where: { OR: [body.phone ? { phone: body.phone } : undefined, body.email ? { email: body.email } : undefined].filter(Boolean) as any } });
  if (exists) return reply.conflict('Account already exists');
  const user = await prisma.user.create({ data: { displayName: body.displayName, phone: body.phone, email: body.email, passwordHash: body.password ? await argon2.hash(body.password) : null, type: body.type, status: 'ACTIVE', ...(body.type !== UserType.BUYER && body.type !== UserType.ADMIN ? { kyc: { create: { status: 'PENDING' } } } : {}) } });
  await audit(user.id, AuditAction.CREATE, 'User', user.id, null, { type: user.type }, request);
  return reply.code(201).send({ id: user.id, status: user.status, kycRequired: user.type !== UserType.BUYER && user.type !== UserType.ADMIN });
});

app.post('/v1/auth/login', async (request, reply) => {
  const body = z.object({ identifier: z.string().min(3), password: z.string().min(1) }).parse(request.body);
  const user = await prisma.user.findFirst({ where: { OR: [{ email: body.identifier }, { phone: body.identifier }] } });
  if (!user?.passwordHash) return reply.unauthorized('Invalid credentials');
  if (user.status !== 'ACTIVE') return reply.forbidden('Account is not active');
  if (!(await argon2.verify(user.passwordHash, body.password))) return reply.unauthorized('Invalid credentials');
  const access = await signAccess(user.id, user.adminRole);
  const refresh = await signRefresh(user.id);
  await prisma.session.create({ data: { userId: user.id, refreshHash: sha256(refresh), expiresAt: new Date(Date.now() + 30*24*60*60*1000) } });
  await audit(user.id, AuditAction.LOGIN, 'User', user.id, null, null, request);
  return { accessToken: access, refreshToken: refresh, user: { id: user.id, displayName: user.displayName, type: user.type, adminRole: user.adminRole } };
});

app.post('/v1/auth/refresh', async (request, reply) => {
  const body = z.object({ refreshToken: z.string().min(10) }).parse(request.body);
  try {
    const { payload } = await jwtVerify(body.refreshToken, refreshSecret);
    const userId = String(payload.sub);
    const session = await prisma.session.findFirst({ where: { userId, refreshHash: sha256(body.refreshToken), revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!session) return reply.unauthorized('Refresh token revoked or expired');
    return { accessToken: await signAccess(userId, (await prisma.user.findUnique({ where: { id: userId } }))?.adminRole) };
  } catch { return reply.unauthorized('Invalid refresh token'); }
});

app.post('/v1/auth/otp/request', async (_request, reply) => reply.serviceUnavailable('No real SMS provider is configured. Set SMS_PROVIDER and provider credentials; fake OTPs are intentionally disabled.'));

app.get('/v1/me', { preHandler: auth }, async (request) => prisma.user.findUnique({ where: { id: (request as any).userId }, include: { kyc: true, shop: true, addresses: true } }));

app.post('/v1/seller/onboarding', { preHandler: auth }, async (request, reply) => {
  const userId = (request as any).userId as string;
  const body = z.object({ shopName: z.string().min(2).max(120), description: z.string().max(2000).optional(), deliveryPolicy: z.nativeEnum(DeliveryPolicy), deliveryZones: z.any().optional(), deliveryConfig: z.any().optional(), region: z.string().min(1), province: z.string().min(1), city: z.string().min(1), sector: z.string().optional(), neighborhood: z.string().optional(), latitude: z.number().optional(), longitude: z.number().optional() }).parse(request.body);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.type === UserType.BUYER || user.type === UserType.ADMIN) return reply.forbidden('Seller profile required');
  if (!user.kyc || user.kyc.status !== 'APPROVED') return reply.conflict('KYC must be approved before shop activation');
  if (!body.deliveryPolicy) return reply.badRequest('Delivery policy is required');
  const existing = await prisma.shop.findUnique({ where: { ownerId: userId } });
  const slug = body.shopName.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'') + '-' + userId.slice(-6);
  const shop = existing ? await prisma.shop.update({ where: { ownerId: userId }, data: { name: body.shopName, description: body.description, deliveryPolicy: body.deliveryPolicy, deliveryZones: body.deliveryZones, deliveryConfig: body.deliveryConfig, region: body.region, province: body.province, city: body.city, sector: body.sector, neighborhood: body.neighborhood, latitude: body.latitude, longitude: body.longitude, status: 'ACTIVE' } }) : await prisma.shop.create({ data: { ownerId: userId, name: body.shopName, slug, description: body.description, deliveryPolicy: body.deliveryPolicy, deliveryZones: body.deliveryZones, deliveryConfig: body.deliveryConfig, region: body.region, province: body.province, city: body.city, sector: body.sector, neighborhood: body.neighborhood, latitude: body.latitude, longitude: body.longitude, status: 'ACTIVE', verified: false } });
  await audit(userId, AuditAction.UPDATE, 'Shop', shop.id, existing, shop, request);
  return reply.send(shop);
});

app.post('/v1/seller/kyc', { preHandler: auth }, async (request) => {
  const userId = (request as any).userId as string;
  const body = z.object({ identityType: z.string().min(2), identityNumber: z.string().min(2), documents: z.array(z.object({ key: z.string().min(1), kind: z.string().min(1) })).min(1) }).parse(request.body);
  const kyc = await prisma.kycProfile.upsert({ where: { userId }, update: { identityType: body.identityType, identityNumber: body.identityNumber, documents: body.documents, status: 'PENDING', submittedAt: new Date() }, create: { userId, identityType: body.identityType, identityNumber: body.identityNumber, documents: body.documents, status: 'PENDING', submittedAt: new Date() } });
  await audit(userId, AuditAction.UPDATE, 'KycProfile', kyc.id, null, { status: kyc.status }, request);
  return kyc;
});

app.post('/v1/products', { preHandler: auth }, async (request, reply) => {
  const userId = (request as any).userId as string;
  const shop = await prisma.shop.findUnique({ where: { ownerId: userId } });
  if (!shop || shop.status !== 'ACTIVE') return reply.forbidden('Active shop required');
  const body = z.object({ name: z.string().min(2).max(180), description: z.string().max(10000).optional(), priceXof: z.number().int().positive(), categoryId: z.string().optional(), brand: z.string().optional(), media: z.any().optional(), attributes: z.any().optional(), wholesaleRules: z.any().optional(), initialStock: z.number().int().min(0).default(0) }).parse(request.body);
  const slug = body.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'') + '-' + crypto.randomBytes(3).toString('hex');
  const product = await prisma.$transaction(async tx => {
    const p = await tx.product.create({ data: { shopId: shop.id, categoryId: body.categoryId, name: body.name, slug, description: body.description, priceXof: body.priceXof, brand: body.brand, media: body.media, attributes: body.attributes, wholesaleRules: body.wholesaleRules, status: 'DRAFT' } });
    await tx.inventory.create({ data: { productId: p.id, realStock: body.initialStock } });
    return p;
  });
  await audit(userId, AuditAction.CREATE, 'Product', product.id, null, product, request);
  return reply.code(201).send(product);
});

app.post('/v1/orders', { preHandler: auth }, async (request, reply) => {
  const userId = (request as any).userId as string;
  const body = z.object({ addressId: z.string().optional(), items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(10000) })).min(1) }).parse(request.body);
  const ids = body.items.map(i => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: ids }, status: 'PUBLISHED' }, include: { inventory: true, shop: true } });
  if (products.length !== ids.length) return reply.badRequest('One or more products are unavailable');
  const shopIds = new Set(products.map(p => p.shopId));
  if (shopIds.size !== 1) return reply.badRequest('Split a multi-vendor cart into sub-orders before checkout');
  if (body.addressId && !(await prisma.address.findFirst({ where: { id: body.addressId, userId } }))) return reply.badRequest('Invalid address');
  const total = products.reduce((sum, p) => { const qty = body.items.find(i => i.productId === p.id)!.quantity; const available = (p.inventory?.realStock || 0) - (p.inventory?.reservedStock || 0); if (available < qty) throw new Error(`Insufficient stock for ${p.name}`); return sum + p.priceXof * qty; }, 0);
  const order = await prisma.$transaction(async tx => {
    for (const p of products) { const qty = body.items.find(i => i.productId === p.id)!.quantity; const r = await tx.inventory.updateMany({ where: { productId: p.id, realStock: { gte: qty } }, data: { reservedStock: { increment: qty } } }); if (r.count !== 1) throw new Error('Stock reservation failed'); }
    const orderNumber = `BM-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const rawCode = randomCode();
    const order = await tx.order.create({ data: { orderNumber, buyerId: userId, shopId: products[0].shopId, addressId: body.addressId, subtotalXof: total, totalXof: total, status: 'PAYMENT_PENDING', deliveryCodeHash: sha256(rawCode), items: { create: products.map(p => { const qty = body.items.find(i => i.productId === p.id)!.quantity; return { productId: p.id, productName: p.name, quantity: qty, unitPriceXof: p.priceXof, subtotalXof: qty * p.priceXof }; }) } } });
    await tx.payment.create({ data: { orderId: order.id, provider: 'UNCONFIGURED', amountXof: total, status: 'PENDING' } });
    await tx.ledgerEntry.create({ data: { orderId: order.id, type: 'PAYMENT', amountXof: 0, reference: 'PENDING_PAYMENT' } });
    return { order, rawCode };
  });
  return reply.code(201).send({ order: order.order, deliveryCode: order.rawCode });
});

app.post('/v1/orders/:id/delivery/confirm', { preHandler: auth }, async (request, reply) => {
  const userId = (request as any).userId as string;
  const id = (request.params as any).id as string;
  const body = z.object({ code: z.string().length(6) }).parse(request.body);
  const order = await prisma.order.findUnique({ where: { id }, include: { delivery: true } });
  if (!order) return reply.notFound('Order not found');
  if (!order.delivery) return reply.badRequest('Delivery not assigned');
  if (order.delivery.driverId !== userId) return reply.forbidden('Not assigned to this delivery');
  if (order.deliveryCodeUsedAt) return reply.conflict('Delivery code already used');
  if (!order.deliveryCodeHash || sha256(body.code.toUpperCase()) !== order.deliveryCodeHash) return reply.unauthorized('Invalid delivery code');
  const updated = await prisma.$transaction(async tx => {
    const now = new Date();
    const o = await tx.order.update({ where: { id }, data: { status: 'DELIVERED', deliveryCodeUsedAt: now } });
    await tx.delivery.update({ where: { orderId: id }, data: { status: 'DELIVERED', deliveredAt: now, proof: { confirmedByDriverId: userId, at: now.toISOString() } } });
    await tx.ledgerEntry.create({ data: { orderId: id, type: 'ADJUSTMENT', amountXof: 0, reference: 'DELIVERY_CONFIRMED' } });
    return o;
  });
  await audit(userId, AuditAction.UPDATE, 'Order', id, { status: order.status }, { status: updated.status }, request);
  return updated;
});

app.get('/v1/admin/overview', { preHandler: adminOnly }, async () => {
  const [users, sellers, products, orders, payments, refunds, deliveries, disputes, recentOrders, risks, logs] = await prisma.$transaction([
    prisma.user.count(), prisma.shop.count(), prisma.product.count({ where: { status: 'PUBLISHED' } }), prisma.order.count(), prisma.payment.count({ where: { status: 'CAPTURED' } }), prisma.ledgerEntry.count({ where: { type: 'REFUND' } }), prisma.delivery.count(), prisma.order.count({ where: { status: 'DISPUTED' } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { buyer: { select: { displayName: true } }, items: { take: 1 }, shop: { select: { name: true } } } }),
    prisma.fraudEvent.findMany({ take: 8, orderBy: { createdAt: 'desc' } }), prisma.auditLog.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { actor: { select: { displayName: true } } } })
  ]);
  return { counts: { users, sellers, products, orders, payments, refunds, deliveries, disputes }, recentOrders, risks, logs };
});

app.get('/v1/admin/kyc/pending', { preHandler: adminOnly }, async () => prisma.kycProfile.findMany({ where: { status: { in: ['PENDING','IN_REVIEW'] } }, include: { user: { select: { id: true, displayName: true, phone: true, email: true, type: true } } }, orderBy: { submittedAt: 'asc' } }));

app.post('/v1/admin/kyc/:userId/decision', { preHandler: adminOnly }, async (request, reply) => {
  const actorId = (request as any).userId as string;
  const userId = (request.params as any).userId as string;
  const body = z.object({ decision: z.enum(['APPROVED','REJECTED']), reason: z.string().max(500).optional() }).parse(request.body);
  const before = await prisma.kycProfile.findUnique({ where: { userId } });
  if (!before) return reply.notFound('KYC not found');
  if (body.decision === 'REJECTED' && !body.reason) return reply.badRequest('Rejection reason is required');
  const after = await prisma.kycProfile.update({ where: { userId }, data: { status: body.decision, rejectionReason: body.decision === 'REJECTED' ? body.reason : null, reviewedAt: new Date() } });
  await audit(actorId, body.decision === 'APPROVED' ? AuditAction.APPROVE : AuditAction.REJECT, 'KycProfile', after.id, before, after, request, body.reason);
  return after;
});

app.register(async (instance) => {
  instance.get('/v1/realtime', { websocket: true }, (socket, _request) => {
    socket.send(JSON.stringify({ type: 'connected', service: 'burkina-market-realtime' }));
  });
});

app.setErrorHandler((err, _request, reply) => { app.log.error(err); if ((err as any).statusCode) return reply.code((err as any).statusCode).send({ error: err.message }); return reply.code(500).send({ error: 'Internal server error' }); });

await app.listen({ port, host: '0.0.0.0' });
