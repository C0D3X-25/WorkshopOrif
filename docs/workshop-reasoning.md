# Workshop — Raisonnement (Thinking / Reasoning)

> Fichier de contexte temporaire. Résumé de la discussion de conception. À supprimer une fois le workshop finalisé.

## Objectif du workshop

Créer un ou plusieurs workshops **théoriques** sur le concept de **raisonnement** (*thinking* / *reasoning*) dans le contexte des LLMs — en famille autonome, sur le modèle de `workshop-tools.md`.

**Pas d'exercice pratique** dans cette itération : uniquement de la théorie et du self-assessment.

**Prérequis pédagogique** : l'apprenant a déjà suivi le workshop **Outils (Tools)** — il comprend qu'un modèle seul ne fait que générer du texte et que les outils le connectent au monde réel. Le raisonnement est le bloc suivant : *comment le modèle réfléchit avant de répondre*.

---

## Structure envisagée

- **Famille autonome** — pas un simple chapitre de `atelier-ia-avance`.
- **Deux niveaux** : Introduction + Avancé.
- **Livraison dans l'app** : *à décider* lors de la conversion JSON (deux workshops séparés ou contenu profil-gated dans un seul document).
- **Type** : Theory uniquement (Exercise envisagé ultérieurement).

| Niveau | Profils | Chapitres | Questions self-assessment |
|--------|---------|-----------|---------------------------|
| Introduction | Observer, Apprentice | 1 | 2 |
| Avancé | Apprentice uniquement | 4 | 2 par chapitre (~8) |

> **Intern** : exclu — concept jugé trop abstrait pour un stage d'une demi-journée (même logique que Tools intro).

---

## Niveau : Introduction

> Profils ciblés : **Observer, Apprentice**

### Takeaway unique

> *« Certains modèles génèrent un brouillon interne (thinking) avant la réponse finale — on paie en temps et en tokens, mais on gagne en précision sur les problèmes difficiles. »*

### Format

**Théorie pure** — pas de démo pas-à-pas, pas d'exercice. Les apprenants lisent et répondent au self-assessment.

On peut **mentionner** des exemples concrets (ChatGPT standard vs reasoning, Gemini « Show thinking », Cursor avec niveaux de raisonnement) sans guider l'apprenant à les reproduire.

### Contenu du chapitre unique

1. **Définition simple** — le modèle « réfléchit » avant de répondre ; ce brouillon s'appelle *reasoning tokens* / *thinking tokens*.
2. **Analogie** — résoudre un problème difficile sur papier brouillon avant de rédiger la réponse propre.
3. **Quand c'est utile** — logique, maths, code complexe, débogage, planification multi-étapes.
4. **Quand s'en passer** — pas seulement une question de temps/coût :
   - tâches simples (FAQ, traduction, résumé, rédaction créative) ;
   - besoin de rapidité (chat en direct) ;
   - risque de *sur-réflexion* sur des questions faciles ;
   - fenêtre de contexte limitée (les tokens de raisonnement consomment le budget) ;
   - le raisonnement n'ajoute **pas** de nouvelles capacités (pas d'internet, pas de fichiers — ce sont les **outils**).
5. **Signes visibles** — latence plus longue, indicateur « Thinking… », balises `&lt;think&gt;…&lt;/think&gt;` (DeepSeek-R1) selon le produit.

### Self-assessment (2 questions envisagées)

- Définition des reasoning tokens.
- Quand utiliser / ne pas utiliser le raisonnement (tâche + critère autre que le coût).

---

## Niveau : Avancé

> Profils ciblés : **Apprentice (CFC) uniquement**

### Takeaway unique

> *« Le raisonnement intégré au modèle n'est pas du prompt engineering — c'est une capacité d'entraînement/architecture. Choisir le bon modèle et le bon niveau d'effort, c'est un compromis précision / latence / coût / contexte. »*

### Structure : 4 chapitres

#### Chapitre 1 — Qu'est-ce que le raisonnement ?

- Reasoning tokens vs tokens de réponse finale.
- Flux : prompt → brouillon interne → réponse.
- Visible vs caché (DeepSeek-R1 vs o3 vs Claude extended thinking).
- Impact sur la fenêtre de contexte et la facturation.

#### Chapitre 2 — Chain-of-Thought vs raisonnement intégré

- **⚠️ À décider (frontière avec le workshop Prompting)** :
  - Option retenue par défaut : *rappel léger* de CoT (zero-shot « Raisonne étape par étape ») + renvoi au workshop Prompting pour la technique en profondeur.
  - Ce chapitre se concentre sur la **distinction** : CoT = technique de prompt sur un modèle standard ; raisonnement intégré = comportement natif du modèle, sans instruction explicite.
- Limites du CoT sur petits modèles vs gain sur modèles reasoning.

#### Chapitre 3 — Trade-offs et critères de choix

- Tableau comparatif LLM standard vs modèle reasoning (latence, coût, précision, créativité, conversation simple).
- Quand le raisonnement **dégrade** ou n'apporte rien (voir section Intro, approfondie).
- Raisonnement **≠** outils : un modèle reasoning sans tools reste déconnecté du monde réel.
- En production : coût à l'échelle, SLA de latence, budget tokens.

#### Chapitre 4 — Paysage des modèles et Cursor

- Modèles accessibles gratuitement ou localement (à maintenir à jour) :

| Modèle | Accès | Raisonnement visible ? |
|--------|-------|------------------------|
| o3-mini / o4-mini (OpenAI) | ChatGPT free tier (limité) | Non (thinking caché) |
| Gemini 2.5 Flash | Google AI Studio (gratuit) | Oui (`thinkingBudget`, « Show thinking ») |
| DeepSeek-R1:7b | Ollama (local) | Oui (balises `&lt;think&gt;…&lt;/think&gt;`) |
| QwQ-32B | Ollama (local, RAM élevée) | Oui |

- **Cursor** : sélection du modèle, niveaux d'effort (Low / Medium / High / Max selon modèle), raccourci `Ctrl+Shift+/` pour cycler — *rollout progressif, ne pas supposer que tous les apprenants y ont accès*.
- Message clé : le choix du niveau de raisonnement dans Cursor est le même compromis que dans ChatGPT — plus d'effort = plus lent, plus cher, souvent meilleur sur les tâches dures.

### Self-assessment (2 questions par chapitre)

Thèmes envisagés par chapitre :

1. Reasoning tokens, visible vs caché.
2. CoT vs raisonnement intégré.
3. Critères de choix (dont cas où ne **pas** utiliser le raisonnement).
4. Modèles du paysage + compromis dans Cursor.

---

## Discussion de conception

### Raisonnement vs outils (suite logique du curriculum)

| | Outils (workshop précédent) | Raisonnement (ce workshop) |
|--|----------------------------|----------------------------|
| Question | Comment le modèle **agit** sur le monde ? | Comment le modèle **réfléchit** avant de répondre ? |
| Mécanisme | Function calling, exécution hors modèle | Tokens de brouillon interne, puis réponse |
| Sans ça | Le modèle ne peut que parler | Le modèle répond en un seul passage, sans brouillon structuré |

Les deux sont **complémentaires** : un agent peut être à la fois *reasoning* et *tool-enabled*.

### Pourquoi pas d'exercice (pour l'instant)

- Observer n'a pas besoin de manipuler des APIs ou Ollama pour comprendre le concept.
- Les comparaisons live (GPT-4o vs o3, Gemini Show thinking) sont pédagogiques mais optionnelles — réservées à une future itération Exercise ou à la démonstration en salle par le formateur.
- Un futur workshop Exercise pourrait couvrir : comparaison chronométrée standard vs reasoning, ou lecture des balises `&lt;think&gt;…&lt;/think&gt;` avec DeepSeek-R1 local.

### Ce que le raisonnement n'est **pas**

- Pas de la magie — c'est du compute supplémentaire (plus de tokens générés).
- Pas un substitut aux outils (recherche web, fichiers, API).
- Pas toujours « mieux » — sur-tâche fréquente sur les questions simples.
- Pas équivalent au prompt CoT — même si l'effet peut sembler similaire pour l'utilisateur.

### Frontière avec le workshop Prompting

| Workshop Prompting | Workshop Raisonnement |
|--------------------|----------------------|
| CoT, few-shot, role prompting, format | Reasoning tokens, modèles natifs, trade-offs |
| Technique applicable à tout modèle | Capacité liée au modèle / au produit |
| « Raisonne étape par étape » | Pas besoin de le demander — le modèle le fait seul |

**Décision ouverte** : niveau de détail du rappel CoT au chapitre 2 Avancé.

### Fil rouge pédagogique

```
Intro LLM → Prompting → Tools → Raisonnement (ce workshop) → [futur: MCP, Agents, …]
```

---

## Décisions prises

| # | Décision |
|---|----------|
| 1 | Famille autonome (standalone), pas un chapitre de l'atelier avancé |
| 2 | Introduction + Avancé ; Intern exclu |
| 3 | Theory only — pas d'exercice dans cette itération |
| 4 | Takeaway intro : brouillon interne, trade-off temps/coût vs précision |
| 5 | Intro : théorie pure, pas de démo guidée |
| 6 | Avancé : plongée pratique (tokens, CoT, trade-offs, paysage, Cursor) |
| 7 | Structure : 1 chapitre intro + 4 chapitres avancés |
| 8 | App : structure TBD à la conversion JSON |
| 9 | Self-assessment : 2 questions (intro) + 2 par chapitre avancé |
| 10 | Prérequis : après le workshop Tools |

## Décisions ouvertes

- [ ] Structure app : un ou deux workshops JSON ?
- [ ] Frontière exacte CoT / Prompting au chapitre 2 Avancé
- [ ] Tableau des modèles : qui maintient la liste à jour ?
- [ ] Workshop Exercise futur : comparaison live, DeepSeek local, ou Cursor reasoning levels ?
- [ ] Durée estimée, auteurs, track Formation (métadonnées workshop)
