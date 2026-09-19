import React, { useMemo, useState } from "react";

const products = [
  { id:1, name:"Samsung Galaxy A14", price:85000, old:95000, rating:4.8, cat:"Électronique", img:"https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500&q=80" },
  { id:2, name:"Riz local 25kg", price:18000, rating:4.6, cat:"Alimentation", img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80" },
  { id:3, name:"Tecno Spark 10", price:70000, rating:4.5, cat:"Électronique", img:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&q=80" },
  { id:4, name:"Infinix Hot 30i", price:62000, rating:4.4, cat:"Électronique", img:"https://images.unsplash.com/photo-1592286927505-4fd8d9e4a8d4?w=500&q=80" },
  { id:5, name:"Casque Bluetooth", price:12000, rating:4.6, cat:"Électronique", img:"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80" },
  { id:6, name:"Chargeur rapide", price:5000, rating:4.4, cat:"Électronique", img:"https://images.unsplash.com/photo-1587033411391-5d9b4c1f2a8f?w=500&q=80" }
];

const categories = [
  ["📱","Électronique","blue"],["👗","Mode & Beauté","pink"],["🏠","Maison & Déco","orange"],
  ["🛒","Alimentation","green"],["⚽","Sport & Loisirs","purple"],["🚗","Automobile","red"],
  ["🛠️","Services","cyan"],["◉","Autres","gray"]
];

const nav = [
  ["home","Accueil","⌂"],["categories","Catégories","▦"],["favorites","Favoris","♡"],
  ["orders","Commandes","▤"],["profile","Profil","◯"]
];

const money = n => new Intl.NumberFormat("fr-FR").format(n) + " CFA";

function Logo({dark=false}) {
  return <div className={dark ? "brand brand-dark" : "brand"}><span>Burkina</span><b>Market</b></div>;
}

function Top({title, back, onBack, action}) {
  return <header className="top">
    <button className="icon-btn" onClick={onBack}>{back ? "‹" : "☰"}</button>
    <div className="top-title">{title || <Logo/>}</div>
    {action || <button className="icon-btn">♧</button>}
  </header>;
}

function Search({value,setValue,placeholder="Rechercher un produit, une boutique..."}) {
  return <div className="search"><span>⌕</span><input value={value} onChange={e=>setValue?.(e.target.value)} placeholder={placeholder}/>{value && <button onClick={()=>setValue("")}>×</button>}</div>
}

function ProductCard({p,onOpen,onAdd}) {
  return <article className="product-card" onClick={()=>onOpen(p)}>
    <div className="product-photo"><img src={p.img} alt="" /><button onClick={e=>{e.stopPropagation();onAdd(p)}}>🛒</button></div>
    <div className="product-name">{p.name}</div>
    <div className="price">{money(p.price)}</div>
    <div className="rating">★ {p.rating}</div>
  </article>
}

function Home({go,add}) {
  const [q,setQ]=useState("");
  return <div>
    <div className="blue-hero">
      <div className="hero-head"><Logo/><span>♟　◯</span></div>
      <Search value={q} setValue={setQ}/>
      <h1>Tout ce dont vous avez besoin,<br/>au même endroit !</h1>
      <p>Produits · Services · Boutiques locales</p>
      <button className="pill light" onClick={()=>go("categories")}>Découvrir</button>
      <div className="landmark">🏙️🌳🏛️</div>
    </div>
    <div className="quick-grid">
      {["Produits","Boutiques","Services","Vendre"].map((x,i)=><button key={x} onClick={()=>go(i===0?"home":i===1?"store":i===2?"services":"seller")}><span>{["▣","⌂","⚒","♙"][i]}</span>{x}</button>)}
    </div>
    <Section title="Nos meilleures offres" action="Voir tout">
      <div className="product-row">{products.slice(0,2).map(p=><ProductCard key={p.id} p={p} onOpen={x=>go("product",x)} onAdd={add}/>)}</div>
    </Section>
    <Section title="Pour vous">
      <div className="product-grid">{products.slice(2).map(p=><ProductCard key={p.id} p={p} onOpen={x=>go("product",x)} onAdd={add}/>)}</div>
    </Section>
  </div>
}

function Section({title,action,children}) { return <section className="section"><div className="section-head"><h2>{title}</h2>{action&&<button>{action}</button>}</div>{children}</section> }

function Categories({go}) {
  return <div><Top title="Catégories" back onBack={()=>go("home")}/><div className="page-pad"><Search placeholder="Rechercher une catégorie..."/><div className="cat-grid">{categories.map(([icon,name,c])=><button className={"cat "+c} key={name} onClick={()=>go("search",name)}><span>{icon}</span>{name}</button>)}</div></div></div>
}

function SearchPage({go,add,initial=""}) {
  const [q,setQ]=useState(initial);
  const filtered=useMemo(()=>products.filter(p=>!q||p.name.toLowerCase().includes(q.toLowerCase())||p.cat.toLowerCase().includes(q.toLowerCase())),[q]);
  return <div><Top title="Recherche" back onBack={()=>go("home")}/><div className="page-pad"><Search value={q} setValue={setQ}/><div className="tabs"><b>Tout</b><b className="active">Produits</b><b>Boutiques</b><b>Services</b></div><div className="filter-row"><button>Pertinence⌄</button><button>Prix⌄</button><button>Marque⌄</button></div>{filtered.map(p=><ProductList key={p.id} p={p} onOpen={x=>go("product",x)} onAdd={add}/>)}</div></div>
}

function ProductList({p,onOpen,onAdd}) {
 return <div className="product-list" onClick={()=>onOpen(p)}><img src={p.img} alt=""/><div><b>{p.name}</b><small>{p.cat} · {p.rating} ★</small><strong>{money(p.price)}</strong></div><button onClick={e=>{e.stopPropagation();onAdd(p)}}>🛒</button></div>
}

function ProductDetail({p,go,add}) {
 return <div><Top title="" back onBack={()=>go("home")} action={<button className="icon-btn">♡</button>}/><div className="detail-img"><img src={p.img} alt=""/></div><div className="detail"><div className="thumbs">{products.slice(0,4).map(x=><img key={x.id} src={x.img} alt=""/>)}</div><h1>{p.name}</h1><div className="detail-price">{money(p.price)} {p.old&&<del>{money(p.old)}</del>} <em>-10%</em></div><div className="rating">★ {p.rating} · 120 avis</div><hr/><div className="option-title">Couleur</div><div className="dots"><i/><i/><i/></div><button className="primary" onClick={()=>add(p)}>Ajouter au panier</button><p>Vendu par : <b>TechBurkina</b><br/>Livraison rapide partout au Burkina Faso.</p></div></div>
}

function Cart({cart,go,setCart}) {
 const total=cart.reduce((s,p)=>s+p.price,0);
 return <div><Top title="Panier" back onBack={()=>go("home")}/><div className="page-pad"><div className="select-all">☑ Tout sélectionner</div>{cart.length===0?<Empty text="Votre panier est vide."/>:cart.map((p,i)=><div className="cart-row" key={i}><img src={p.img} alt=""/><div><b>{p.name}</b><small>{money(p.price)}</small><div className="qty">−　1　+</div></div><button onClick={()=>setCart(cart.filter((_,j)=>j!==i))}>♧</button></div>)}{cart.length>0&&<div className="summary"><span>Sous-total</span><b>{money(total)}</b><span>Livraison</span><b>2 000 CFA</b><hr/><strong>Total</strong><strong>{money(total+2000)}</strong><button className="primary">Passer la commande</button></div>}</div></div>
}

function Store({go,add}) {
 return <div><Top title="Boutique" back onBack={()=>go("home")}/><div className="store-head"><div className="store-logo">TB</div><div><b>TechBurkina</b><small>Électronique & Accessoires</small><span>4.8 (256 avis)</span></div><button className="pill">Suivre</button></div><div className="tabs"><b className="active">Produits</b><b>Avis</b><b>À propos</b></div><div className="page-pad">{products.map(p=><ProductList key={p.id} p={p} onOpen={x=>go("product",x)} onAdd={add}/>)}</div></div>
}

function Services({go}) {
 const items=[["📱","Réparation téléphone","À partir de 5 000 CFA","4.7"],["🚚","Livraison à domicile","À partir de 2 000 CFA","4.6"],["🖨️","Impression / Photocopie","À partir de 500 CFA","4.5"],["💇","Coiffure & Beauté","À partir de 3 000 CFA","4.8"],["🧹","Nettoyage","À partir de 5 000 CFA","4.2"]];
 return <div><Top title="Services" back onBack={()=>go("home")}/><div className="page-pad"><Search placeholder="Rechercher un service..."/><div className="filter-row"><button className="active">Tous</button><button>À domicile</button><button>En ligne</button></div>{items.map(x=><div className="service-row" key={x[1]}><span>{x[0]}</span><div><b>{x[1]}</b><small>{x[2]} · ★ {x[3]}</small></div><i>›</i></div>)}</div></div>
}

function Orders({go}) {
 return <div><Top title="Mes commandes" back onBack={()=>go("home")}/><div className="page-pad"><div className="filter-row"><button className="active">Toutes</button><button>En cours</button><button>Livrées</button><button>Annulées</button></div>{["#BM123456","#BM123455","#BM123454","#BM123453"].map((id,i)=><div className="order-row" key={id}><div><b>{id}</b><small>{15-i*3} sept. 2026 · {i+1} article(s)</small></div><strong>{money([32000,85000,56000,18000][i])}</strong><em className={i===0?"pending":i===3?"cancel":"done"}>{["En préparation","Livré","Expédié","Annulé"][i]}</em></div>)}</div></div>
}

function Profile({go}) {
 const links=[["▣","Mes commandes","orders"],["☆","Mes avis","comments"],["♡","Mes favoris","favorites"],["⌖","Mes adresses","settings"],["▤","Mon portefeuille","wallet"],["ⓘ","Aide & Assistance","services"],["ⓘ","À propos de Burkina Market","about"]];
 return <div><Top title="Mon profil" back onBack={()=>go("home")} action={<button className="icon-btn">⚙</button>}/><div className="profile-card"><div className="avatar">👤</div><div><h2>Doma Lucifero</h2><small>doma.lucifero@email.com</small><button className="pill">Modifier</button></div></div><div className="page-pad">{links.map(([icon,label,key])=><button className="menu-row" key={label} onClick={()=>go(key)}><span>{icon}</span>{label}<i>›</i></button>)}<button className="logout">Se déconnecter</button></div></div>
}

function Notifications({go}) {
 const notes=[["🟦","Votre commande #BM123456 est en préparation","Il y a 5 min"],["🟦","TechBurkina vous a envoyé un message","Il y a 2 h"],["❤️","Une réduction spéciale sur les téléphones !","Il y a 3 h"],["🟢","Votre avis a été publié.","Il y a 1 jour"],["🟠","Nouvelle offre disponible dans la catégorie Maison & Déco.","Il y a 1 jour"]];
 return <div><Top title="Notifications" back onBack={()=>go("home")}/><div className="page-pad">{notes.map(n=><div className="note-row" key={n[1]}><span>{n[0]}</span><div><b>{n[1]}</b><small>{n[2]}</small></div><i>›</i></div>)}</div></div>
}

function Settings({go}) {
 const items=["Compte","Sécurité","Notifications","Langue","Mode sombre","Préférences de livraison","Confidentialité","À propos"];
 return <div><Top title="Paramètres" back onBack={()=>go("profile")}/><div className="page-pad">{items.map((x,i)=><div className="menu-row" key={x}><span>{["◯","♢","♧","文","◐","⌖","◎","ⓘ"][i]}</span>{x}{x==="Langue"&&<small>Français</small>}{x==="Mode sombre"&&<span className="switch"/>}<i>›</i></div>)}<button className="logout">Se déconnecter</button></div></div>
}

function Seller({go}) {
 return <div><Top title="Espace vendeur" back onBack={()=>go("home")}/><div className="seller-brand"><div className="store-logo">TB</div><div><b>TechBurkina</b><small>Boutique vérifiée</small></div></div><div className="stats-grid"><div><small>Ventes du jour</small><b>125 000 CFA</b></div><div><small>Commandes</small><b>10</b></div><div><small>Produits en stock</small><b>24</b></div><div><small>Visites</small><b>1 240</b></div></div><Section title="Ventes des 7 derniers jours"><div className="chart">{[35,48,32,60,52,74,64].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div></Section><div className="seller-menu">{["Tableau de bord","Mes produits","Mes commandes","Messages","Statistiques","Paramètres"].map(x=><button key={x}>{x}<i>›</i></button>)}</div></div>
}

function Admin({go}) {
 return <div><Top title="Centre de contrôle" back onBack={()=>go("home")}/><div className="admin-head"><div className="avatar">👤</div><div><b>Admin</b><small>Administrateur</small></div></div><div className="stats-grid"><div><small>Utilisateurs</small><b>2 548</b><em>+12%</em></div><div><small>Total produits</small><b>356</b><em>+18%</em></div><div><small>Total commandes</small><b>1 246</b></div><div><small>Utilisateurs actifs</small><b>9 832</b></div></div><div className="admin-menu">{["Tableau de bord","Utilisateurs","Produits","Boutiques","Commandes","Services","Commentaires","Paramètres"].map(x=><button key={x}>{x}<i>›</i></button>)}</div></div>
}

function About({go}) {
 return <div><Top title="À propos" back onBack={()=>go("home")}/><div className="about"><Logo/><p>Burkina Market est une plateforme de commerce en ligne qui connecte les particuliers, les professionnels et les entreprises du Burkina Faso.</p><div className="about-card">🇧🇫 Notre mission<br/><small>Soutenir l'économie locale.</small></div><div className="about-card">🛡️ Notre vision<br/><small>Une expérience digitale et prospère.</small></div><div className="about-card">♥ Contact<br/><small>support@burkinamarket.bf</small></div></div></div>
}

function Empty({text}) { return <div className="empty"><div>🛒</div><b>{text}</b></div> }

export default function App() {
 const [screen,setScreen]=useState("home");
 const [payload,setPayload]=useState(null);
 const [cart,setCart]=useState([]);
 const [toast,setToast]=useState("");
 const go=(next,data=null)=>{setScreen(next);setPayload(data);window.scrollTo({top:0,behavior:"smooth"})};
 const add=p=>{setCart(c=>[...c,p]);setToast("Produit ajouté au panier");setTimeout(()=>setToast(""),1800)};
 const content = screen==="home"?<Home go={go} add={add}/> :
   screen==="categories"?<Categories go={go}/> :
   screen==="search"?<SearchPage go={go} add={add} initial={typeof payload==="string"?payload:""}/> :
   screen==="product"?<ProductDetail p={payload||products[0]} go={go} add={add}/> :
   screen==="cart"?<Cart cart={cart} go={go} setCart={setCart}/> :
   screen==="store"?<Store go={go} add={add}/> :
   screen==="services"?<Services go={go}/> :
   screen==="orders"?<Orders go={go}/> :
   screen==="profile"?<Profile go={go}/> :
   screen==="notifications"?<Notifications go={go}/> :
   screen==="settings"?<Settings go={go}/> :
   screen==="seller"?<Seller go={go}/> :
   screen==="admin"?<Admin go={go}/> :
   screen==="about"?<About go={go}/> :
   <Home go={go} add={add}/>;
 return <div className="stage"><main className="app"><div className="status">9:41 <span>⌁⌁　▮</span></div>{content}<nav className="bottom">{nav.map(([id,label,icon])=><button key={id} className={screen===id?"active":""} onClick={()=>go(id)}><span>{icon}</span>{label}</button>)}<button onClick={()=>go("cart")} className={screen==="cart"?"active":""}><span>🛒{cart.length>0&&<i>{cart.length}</i>}</span>Panier</button></nav></main>{toast&&<div className="toast">{toast}</div>}</div>
}
