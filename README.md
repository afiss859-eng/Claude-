<<<<<<< HEAD
# 🇧🇫 Burkina Market — foundation réelle, sans données simulées

Ce dépôt est une base de production structurée pour **Burkina Market**. Il privilégie une architecture modulaire et une règle importante : **aucun produit, vendeur, commande, statistique, paiement ou OTP fictif n'est injecté dans l'application**.

Les écrans UI s'inspirent fidèlement des maquettes fournies : bleu profond, jaune/or, cartes arrondies, navigation mobile et Control Center sombre.

## Stack

- Web : Next.js + React + TypeScript
- API : Fastify + WebSocket + Zod
- ORM : Prisma
- DB : PostgreSQL
- Cache / temps réel : Redis
- Stockage objet : MinIO/S3-compatible
- Mobile : Expo React Native
- Validation : Zod
- Sécurité : JWT, RBAC, audit, idempotency-ready, rate-limit ready

## Lancement

1. Copier `.env.example` vers `.env`.
2. `docker compose up -d`
3. `corepack enable && corepack prepare pnpm@10.15.0 --activate`
4. `pnpm install`
5. `pnpm db:generate`
6. `pnpm db:migrate`
7. `pnpm dev:api`
8. Dans un autre terminal : `pnpm dev:web`

Le mobile est dans `apps/mobile` et peut être lancé avec Expo.

## Zéro simulation

- Aucun seed avec des données inventées.
- Les tableaux de bord utilisent des agrégations PostgreSQL réelles.
- Les listes vides sont affichées comme **Aucune donnée disponible**.
- L'OTP est refusé tant qu'aucun vrai fournisseur SMS n'est configuré.
- Les paiements et remboursements n'ont pas de faux succès : il faut brancher un prestataire réel via la couche `PaymentGateway`.
- Les images produits sont stockées via une couche S3/MinIO, sans URL inventée.

## Prochaines intégrations de production

Configurer un fournisseur SMS/OTP réel, un fournisseur de paiement réellement disponible au Burkina Faso, un service cartes/GPS, un domaine et TLS, un système d'observabilité, puis les secrets de production. Le dépôt fournit les points d'extension, mais ne prétend pas avoir validé des fournisseurs externes sans leurs identifiants et contrats.

## Structure

`apps/web` — interface acheteur + pages de contrôle
`apps/api` — API réelle
`apps/mobile` — application Expo
`packages/db` — schéma Prisma et migrations
`packages/shared` — types et contrats partagés
`infra` — notes d'infrastructure

## Routes déjà câblées

Web : `/`, `/products`, `/login`, `/seller`, `/checkout`, `/admin`.
API : `/health`, `/v1/categories`, `/v1/products`, `/v1/auth/*`, `/v1/me`, `/v1/seller/*`, `/v1/products` (vendeur), `/v1/orders`, `/v1/orders/:id/delivery/confirm`, `/v1/admin/*`.

Le dépôt contient aussi les trois références UI fournies dans `design-references/`.
=======
# Burkina Market — design officiel

Cette base implémente en React/Vite le design fourni dans la maquette panoramique Burkina Market.

## Écrans intégrés

- Accueil
- Recherche
- Catégories
- Détail produit
- Panier
- Boutique
- Services
- Commandes
- Profil
- Notifications
- Paramètres
- Espace vendeur
- Centre de contrôle administrateur
- Commentaires / vues secondaires
- À propos

## Lancer

```bash
npm install
npm run dev
```

Le projet est volontairement sans backend et sans service payant à ce stade. Les données produits sont locales afin de garder une base légère et facilement connectable à une API plus tard.

## Direction visuelle

La maquette fournie sert de référence : bleu Burkina Market, accents jaune/orange, cartes arrondies, ombres douces, navigation basse, filtres en pastilles, fiches produit compactes et espaces séparés pour client, vendeur et administrateur.
>>>>>>> ed553effc977161008ef658c7ceb47100c98ee26
