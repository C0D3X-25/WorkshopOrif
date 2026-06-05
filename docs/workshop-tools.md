# Workshop — Outils (Tools)

> Fichier de contexte temporaire. Résumé de la discussion de conception. À supprimer une fois le workshop finalisé.

## Objectif du workshop

Créer un workshop théorique et un workshop exercice sur le concept d'**outils** (*tools*) dans le contexte des agents IA / LLMs.

---

## Structure envisagée

Potentiellement deux workshops distincts adaptés à des profils différents (à confirmer).

---

## Niveau : Introduction

> Profils ciblés : à définir
> Constat de départ : sans outils, un LLM ne peut que discuter — il est limité à ses connaissances internes.

**Takeaway unique** : "Un modèle seul ne génère que du texte. Les outils le connectent au monde réel — et c'est l'application, pas le modèle, qui les exécute. Tous les modèles ne sont pas capables de les utiliser."

**Exemple concret principal** : VS Code est disponible pour tous les apprenants. GitHub Copilot (version gratuite) est pré-installé depuis un workshop précédent — pas de setup requis, juste un prérequis à mentionner. Démonstration directe via Copilot en mode agent : demander à l'agent d'écrire ou modifier un fichier, observer le résultat dans l'explorateur en direct. Le modèle n'a pas écrit le fichier lui-même — il a émis un appel à un outil `write_file`, et c'est VS Code qui l'a exécuté.

**Exemple secondaire** : la recherche web dans ChatGPT — quand elle est activée, le modèle peut accéder à des informations récentes qu'il ne connaît pas nativement. Sans elle, ses connaissances sont figées dans le temps.

---

## Niveau : Avancé

> Profils ciblés : Apprentice (CFC)

**Concepts à couvrir :**
- **La boucle agent** : le modèle appelle un outil, reçoit le résultat, décide de l'étape suivante, recommence — jusqu'à ce que la tâche soit terminée.
- **Chaînage d'outils** : utiliser le résultat d'un outil comme entrée d'un autre.
- **Appels parallèles** : un modèle peut appeler plusieurs outils simultanément quand les tâches sont indépendantes.
- **Risques** : appels d'outils hallucinés (le modèle invente un outil qui n'existe pas), boucles infinies, usage non sécurisé d'outils (ex. suppression de fichiers sans confirmation).
- **Créer son propre outil** : écrire une fonction, définir son schéma (nom, description, paramètres), la brancher dans un agent. L'apprenant voit les deux côtés du cycle.

**Exercice envisagé** : créer un outil `get_current_datetime` en **Python** exposé comme serveur MCP local.
- Le modèle ne peut pas connaître l'heure courante seul (figé à sa date d'entraînement) → valeur de l'outil immédiatement évidente.
- GitHub Copilot supporte MCP nativement dans VS Code → l'apprenant enregistre son serveur local, et Copilot peut l'appeler directement.
- Fil rouge pédagogique : intro (qu'est-ce qu'un outil) → théorie avancée (boucle agent, risques) → exercice (écrire un serveur MCP Python, observer Copilot l'utiliser).
- **Prérequis techniques** : Python installé, bibliothèque MCP Python (`mcp` / `fastmcp`), VS Code avec Copilot.

**Implémentation concrète :**

`tools_server.py` — le serveur MCP :
```python
from mcp.server.fastmcp import FastMCP
from datetime import datetime

mcp = FastMCP("my-tools")

@mcp.tool()
def get_current_datetime() -> str:
    """Returns the current date and time."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

if __name__ == "__main__":
    mcp.run(transport="stdio")
```
Le décorateur `@mcp.tool()` génère automatiquement le schéma (nom, description, paramètres) depuis le nom de la fonction, sa docstring et ses types. Aucun JSON à écrire à la main.

`.vscode/mcp.json` — enregistrement dans VS Code :
```json
{
  "servers": {
    "my-tools": {
      "type": "stdio",
      "command": "python",
      "args": ["tools_server.py"]
    }
  }
}
```
VS Code démarre le serveur comme sous-processus (transport `stdio`). Copilot peut alors l'appeler en mode agent.

**Ce que l'apprenant observe** : il demande "Quelle heure est-il ?" à Copilot en mode agent → Copilot appelle `get_current_datetime` → reçoit l'heure réelle → répond. Sans l'outil, le modèle ne peut pas connaître l'heure courante.

---

## Discussion de conception

### MCP (Model Context Protocol)

MCP n'est pas simplement "une API pour les modèles" — c'est un protocole standardisé (développé par Anthropic) conçu spécifiquement pour la relation *agent ↔ serveur d'outils*.
- Une API classique (REST, GraphQL) est faite pour du code-à-code ; le développeur l'encapsule manuellement dans un outil.
- MCP standardise comment un hôte (Cursor, Claude Desktop, une app custom) **découvre dynamiquement** les outils d'un serveur, leurs paramètres, et comment les appeler — sans glue code spécifique.
- Portabilité : un serveur MCP peut être utilisé par n'importe quel agent compatible MCP sans que le développeur de l'agent ne le connaisse à l'avance.
- Analogie : MCP est le standard USB des outils et agents — n'importe quel device USB fonctionne dans n'importe quel port USB.

### Ce que sont les outils (périmètre)

Exemples concrets d'outils : lecture/écriture de fichiers, recherche web, exécution de code, invocation d'un sous-agent, appel MCP, requête base de données, envoi d'email. L'agent Cursor lui-même utilise des outils (ex. `Write`, `StrReplace`) pendant cette session.

### Entraînement et généricité

Le modèle est entraîné sur la *capacité générique* à utiliser des outils, pas sur des outils spécifiques. Il apprend à lire des définitions d'outils dans son contexte et à produire des appels structurés conformes à un schéma (ex. format function calling d'OpenAI). N'importe qui peut créer un outil : tant qu'il respecte le schéma attendu, le modèle peut l'utiliser sans ré-entraînement.
Analogie : on apprend à lire une notice d'utilisation en général — pas chaque notice spécifique.
**Important** : tous les modèles ne sont pas entraînés à utiliser des outils. Aujourd'hui, la quasi-totalité des modèles modernes en sont capables, mais ce n'est pas universel — c'est une capacité qui s'acquiert à l'entraînement.

### Mécanique d'un appel d'outil

- Le développeur définit les outils disponibles (nom, description, schéma des paramètres) et les envoie au modèle avec le message utilisateur.
- Le modèle décide s'il a besoin d'un outil ou peut répondre directement.
- Si besoin, le modèle émet une requête structurée (ex. `{ "tool": "get_weather", "arguments": { "city": "Lausanne" } }`) — il s'arrête là, il n'exécute rien.
- L'application hôte (framework, code applicatif) intercepte cette sortie et exécute la vraie fonction.
- Le résultat est réinjecté dans le contexte de conversation (rôle `tool`), puis le modèle reprend pour produire une réponse finale.
- **Point clé** : le modèle ne touche jamais le monde réel directement — toute l'exécution se passe hors du modèle, sous contrôle de l'application.

