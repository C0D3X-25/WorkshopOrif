using MongoDB.Driver;
using WorkshopOrif.Api.Models;

namespace WorkshopOrif.Api;

public static class DataSeeder
{
    public static async Task SeedAsync(IMongoDatabase db)
    {
        var col = db.GetCollection<Workshop>("workshops");

        if (await col.CountDocumentsAsync(FilterDefinition<Workshop>.Empty) > 0)
            return;

        await col.InsertManyAsync([
            new Workshop
            {
                Title = "Atelier IA — Théorie et Quizz",
                Description = "Introduction à l'intelligence artificielle pour des profils en situation de stage ou d'observation. Couvre les types d'IA, son fonctionnement, ses limites et les bonnes pratiques.",
                Type = WorkshopType.Theory,
                Level = WorkshopLevel.Introduction,
                Track = "Sensibilisation",
                Authors = ["EPSIC"],
                EstimatedDuration = 180,
                Date = new DateTime(2026, 6, 2, 0, 0, 0, DateTimeKind.Utc),
                ContentFr = """
                    Ce document est une base théorique avec quizz, conçu pour être réalisé en une demi-journée. Il sert d'introduction à l'IA pour des profils en situation de stage ou d'observation.

                    ---

                    ## Partie 1 : Théorie

                    ### Chapitre 1 — C'est quoi l'IA ?

                    L'IA ou Intelligence Artificielle, est un domaine de l'informatique qui vise à créer des systèmes capables d'effectuer des tâches qui nécessitent normalement l'intelligence humaine. Cela inclut des tâches telles que la reconnaissance vocale, la compréhension du langage naturel, la prise de décision, et bien plus encore.

                    Bien que beaucoup plus avancée que les systèmes informatiques traditionnels, l'IA est encore loin d'égaler l'intelligence humaine dans tous les domaines. Cependant, elle a déjà démontré des capacités impressionnantes dans des domaines spécifiques, tels que la reconnaissance d'images, la traduction automatique, et les jeux.

                    #### Exercice pratique

                    Sur [Gemini](https://gemini.google.com) ou [ChatGPT](https://chatgpt.com), demandez :

                    > « Explique-moi ce qu'est l'Intelligence Artificielle en 3 phrases simples. »

                    Lisez la réponse et comparez-la avec la définition du chapitre. L'IA a-t-elle bien résumé le concept ?

                    ---

                    ### Chapitre 2 — Les différents types d'IA

                    Il existe plusieurs types d'IA, classés en fonction de leur capacité à apprendre et à s'adapter :

                    - **IA de chat (ou IA de conversation)** : conçue pour simuler une conversation humaine, comme les chatbots.
                    - **IA de reconnaissance d'images** : capable d'identifier et de classer des objets dans des images.
                    - **IA de traduction automatique** : capable de traduire du texte d'une langue à une autre.
                    - **IA générative** : capable de créer du contenu original, comme du texte, des images ou de la musique.
                    - **Agents IA** : capables d'interagir avec leur environnement pour accomplir des tâches spécifiques, comme les assistants virtuels ou les aides à la programmation.

                    #### Exercice pratique

                    Sur [Gemini](https://gemini.google.com), demandez-lui de générer une image d'un paysage (ou utilisez [DALL-E via ChatGPT](https://chatgpt.com)). Ensuite, demandez une traduction d'une phrase de votre choix. Identifiez quel type d'IA vous venez d'utiliser dans chaque cas.

                    ---

                    ### Chapitre 3 — Comment fonctionne l'IA ?

                    L'IA fonctionne grâce à des algorithmes d'apprentissage automatique, qui permettent aux systèmes d'apprendre à partir de données. Basiquement, on montre à l'IA un grand nombre d'exemples, et elle apprend à reconnaître des patterns et à faire des prédictions basées sur ces données.

                    Par exemple, pour entraîner une IA de reconnaissance d'images, on lui montre des milliers d'images étiquetées (par exemple, « chien », « chat », « voiture »), et elle apprend à associer les caractéristiques visuelles de ces images à leurs étiquettes correspondantes.

                    #### Exercice pratique

                    Sur [ChatGPT](https://chatgpt.com) ou [Claude](https://claude.ai), demandez :

                    > « Comment as-tu été entraîné ? »

                    Comparez la réponse avec ce que vous avez appris dans ce chapitre. Notez les similitudes et les différences.

                    ---

                    ### Chapitre 4 — Les problèmes de l'IA

                    Malgré ses avancées, l'IA présente plusieurs problèmes et défis importants.

                    **Biais** — Les systèmes d'IA peuvent refléter les biais présents dans les données sur lesquelles ils sont entraînés, ce qui peut conduire à des résultats erronés ou orientés.

                    > *Définition :* Un biais est une tendance systématique à produire des résultats erronés ou injustes en raison de préjugés. Chez les humains, on parle par exemple du *biais de confirmation* : la tendance à rechercher des informations qui confirment nos croyances préexistantes. De même, les systèmes d'IA peuvent présenter des biais si leurs données d'entraînement sont biaisées.

                    **Hallucinations** — Les systèmes d'IA peuvent générer des informations incorrectes ou inventées, ce qui peut être problématique, surtout dans des contextes critiques.

                    > *Pourquoi les IA hallucinent-elles ?* Les IA font des prédictions basées sur des probabilités. Parfois, elles extrapolent ou font des associations incorrectes. Imaginez le dicton : « Si tu vois un grand animal à quatre pattes qui galope, pense à un cheval et pas à un zèbre. » Les IA fonctionnent de la même manière : si leurs données d'entraînement ne contiennent pas assez d'exemples de zèbres, elles pourraient considérer que tous les animaux ressemblant à un cheval sont des chevaux, même s'ils ont des rayures. De plus, les IA sont conçues pour produire une réponse satisfaisante plutôt qu'une réponse vraie — elles peuvent inventer des informations si cela semble correspondre à ce que l'utilisateur attend.

                    **Biais de confirmation** — Les utilisateurs peuvent être tentés de ne chercher que des informations qui confirment leurs croyances, et les IA sont conçues pour les satisfaire.

                    > *Exemple :* Si un utilisateur pense que 2 + 2 = 5 et qu'il pose la question à une IA de manière orientée, l'IA pourrait confirmer cette croyance erronée. Il est donc crucial de vérifier les informations fournies par les IA.

                    **Confidentialité des données** — Les systèmes d'IA peuvent collecter et utiliser des données personnelles sans consentement explicite. La plupart des modèles tournent sur des serveurs distants, et les données fournies peuvent être utilisées à des fins diverses, posant des risques pour la confidentialité personnelle et professionnelle.

                    #### Exercice pratique — Tester les hallucinations

                    Sur [Gemini](https://gemini.google.com) ou [ChatGPT](https://chatgpt.com), posez une question sur un sujet précis que vous connaissez bien (ex : une ville de votre région, un logiciel que vous utilisez). Vérifiez si la réponse est exacte. Notez si vous détectez des erreurs ou des imprécisions.

                    #### Exercice pratique — Tester le biais de confirmation

                    Sur [ChatGPT](https://chatgpt.com) ou [Claude](https://claude.ai), posez la même question de deux façons opposées, par exemple :

                    1. « Est-ce que [X] est une bonne idée ? »
                    2. « Est-ce que [X] est une mauvaise idée ? »

                    Observez comment l'IA adapte sa réponse selon la formulation.

                    ---

                    ### Chapitre 5 — Comment bien utiliser l'IA ?

                    Pour bien utiliser l'IA, il est important de suivre quelques bonnes pratiques :

                    - **Vérifier les informations** : ne pas se fier aveuglément aux réponses de l'IA, et les vérifier auprès de sources fiables (experts humains, articles scientifiques, sites officiels).
                    - **Être conscient des biais** : comprendre que les IA peuvent présenter des biais et être vigilant quant à la manière dont leurs réponses sont utilisées, surtout dans des contextes sensibles.
                    - **Protéger la confidentialité des données** : ne jamais divulguer d'informations sensibles ou personnelles à une IA, et être conscient de ce que l'on partage.

                    #### Exercice pratique — Prompt engineering

                    Sur [Claude](https://claude.ai) ou [ChatGPT](https://chatgpt.com), essayez 3 façons différentes de poser la même question :

                    1. **Vague :** « Parle-moi de l'IA »
                    2. **Précise :** « Explique l'IA en 5 points pour un débutant »
                    3. **Avec contexte :** « Je suis stagiaire en informatique, explique-moi l'IA en 5 points accessibles »

                    Comparez les 3 réponses. Qu'est-ce qui change ? Quelle formulation donne les meilleurs résultats ?

                    ---

                    ### Chapitre 6 — Le contexte

                    **Qu'est-ce que le contexte ?**

                    Le **contexte**, c'est l'ensemble des informations que l'IA possède au moment où elle génère sa réponse. Cela inclut votre message actuel, l'historique de la conversation, les éventuelles instructions de configuration, et tout document ou texte que vous avez fourni.

                    Plus le contexte est complet et clair, meilleure sera la réponse. Un contexte vague produit une réponse vague.

                    > *Analogie — Le stagiaire sans briefing :* Si vous demandez à un stagiaire de rédiger un e-mail sans lui donner d'informations sur le projet, le client ou le ton attendu, il fera de son mieux — mais le résultat sera générique. Si vous lui donnez le contexte complet, il produira un bien meilleur travail. **L'IA fonctionne exactement de la même façon.**

                    | Prompt pauvre | Prompt avec bon contexte |
                    |---|---|
                    | « Aide-moi avec mon mail. » | « Je dois envoyer un e-mail professionnel à un client mécontent. Ton : poli et professionnel. Longueur : 3 phrases. Problème : livraison en retard de 2 jours. » |

                    *Lien avec le Chapitre 4 :* un contexte riche réduit les hallucinations, car l'IA dispose de plus d'informations pour répondre correctement.

                    **La fenêtre de contexte**

                    L'IA ne peut pas traiter une quantité illimitée de texte. Elle dispose d'une **fenêtre de contexte** : la quantité maximale de texte qu'elle peut prendre en compte lors d'une interaction. Cette limite est mesurée en **tokens** — des unités de texte d'une longueur variable.

                    Les outils gratuits actuels ont des fenêtres très généreuses : [ChatGPT](https://chatgpt.com) gère jusqu'à 128 000 tokens, [Claude](https://claude.ai) jusqu'à 200 000 tokens, et [Gemini](https://gemini.google.com) jusqu'à 1 million de tokens. En pratique, pour un usage quotidien, cette limite est rarement atteinte.

                    Si vous dépassez cette limite, l'IA « oublie » les parties les plus anciennes de la conversation et peut sembler incohérente avec ce qui a été dit au début.

                    > *Analogie — Le tableau blanc effaçable :* L'IA dispose d'un tableau blanc de taille fixe. Au début d'une conversation, il est vierge. À chaque message échangé, on y inscrit du texte. Quand le tableau est plein, l'IA doit effacer les informations les plus anciennes pour continuer à écrire.

                    **Le rechargement du contexte**

                    Par défaut, chaque nouvelle conversation repart de zéro : l'IA n'a aucun souvenir de vos échanges précédents. Certains outils proposent une fonctionnalité « Mémoire » (comme [ChatGPT](https://chatgpt.com)), mais elle est optionnelle, limitée et ne remplace pas un bon contexte fourni explicitement.

                    La bonne habitude : **ouvrez chaque nouvelle conversation avec un bloc de contexte structuré**.

                    > *Analogie — Le collègue avec la mémoire effacée :* Imaginez un collègue qui arrive chaque matin sans aucun souvenir de la veille. Ce n'est pas un défaut — c'est simplement sa façon de fonctionner. Pour travailler efficacement avec lui, vous devez lui redire chaque matin où en est le projet. Avec l'IA, c'est pareil.

                    Modèle de bloc de contexte à réutiliser au début de chaque nouvelle conversation :

                    > Mon rôle : [qui vous êtes]
                    > Le projet : [ce sur quoi vous travaillez]
                    > L'objectif : [ce que vous voulez accomplir]
                    > Ma question : [votre question précise]

                    *Rappel du Chapitre 4 :* ne jamais inclure de données confidentielles (mots de passe, informations personnelles, données d'entreprise) dans un bloc de contexte.

                    **Comment bien contextualiser ?**

                    Pour construire un contexte efficace, utilisez le cadre **5W** (Qui / Quoi / Pour qui / Comment / Pourquoi) :

                    | Question | Ce qu'elle apporte | Exemple |
                    |---|---|---|
                    | **Qui ?** | Le rôle que l'IA doit jouer | « Tu es un assistant de rédaction professionnel » |
                    | **Quoi ?** | La tâche précise | « Rédige un paragraphe de présentation LinkedIn » |
                    | **Pour qui ?** | Le public cible | « Pour un recruteur dans le domaine informatique » |
                    | **Comment ?** | Le format ou le style attendu | « En 3 phrases, ton professionnel mais accessible » |
                    | **Pourquoi ?** | L'objectif ou le contexte | « Je cherche mon premier emploi en développement web » |

                    *Lien avec le Chapitre 5 :* fournir un contexte riche est la bonne pratique la plus importante dans l'utilisation de l'IA.

                    #### Exercice pratique — Vague vs. contextualisé, puis rechargement

                    **Partie A — Prompt vague vs. prompt contextualisé (5–10 min)**

                    Sur [ChatGPT](https://chatgpt.com) ou [Gemini](https://gemini.google.com), envoyez d'abord ce prompt vague :

                    > « Aide-moi à rédiger un texte. »

                    Notez la réponse générique obtenue. Puis, dans la **même conversation**, envoyez la version enrichie avec le cadre 5W :

                    > « Tu es un assistant de rédaction professionnel. Rédige un paragraphe de présentation LinkedIn en 3 phrases, avec un ton professionnel mais accessible, pour un recruteur dans le domaine informatique. Je cherche mon premier emploi en développement web. »

                    Comparez les deux réponses. Qu'est-ce qui a changé ?

                    **Partie B — Rechargement du contexte (5–10 min)**

                    1. Fermez la conversation et ouvrez-en une **nouvelle** sur [Gemini](https://gemini.google.com).
                    2. Envoyez directement (sans contexte) :

                    > « Quelles pages dois-je créer pour mon site ? »

                    Notez la réponse générique. Ouvrez ensuite une autre nouvelle conversation et commencez par ce bloc de contexte :

                    > Mon rôle : je suis étudiant en informatique.
                    > Le projet : créer un site web sur les plantes exotiques pour des débutants en botanique.
                    > L'objectif : publier des fiches informatives sur 20 plantes.
                    > Ma question : Quelles pages dois-je créer pour mon site ?

                    Comparez les deux réponses. L'IA peut-elle vraiment faire mieux quand elle a du contexte ?

                    ---

                    ## Partie 2 : Expérimentation

                    Maintenant que vous avez lu la théorie et répondu aux quizz, il est temps d'expérimenter directement avec des outils IA ! Ces activités sont libres : il n'y a pas de mauvaise réponse, l'objectif est de découvrir et d'explorer.

                    ### Activité 1 — Améliorer un texte avec une IA

                    Rédigez une courte présentation de vous-même (3 à 5 phrases : qui vous êtes, votre stage, ce que vous y faites). Ensuite, demandez à une IA de l'améliorer :

                    > « Voici une courte présentation de moi : [votre texte]. Peux-tu l'améliorer pour la rendre plus professionnelle et claire ? »

                    Comparez votre version originale avec la version améliorée par l'IA. Qu'a-t-elle changé ?

                    ### Activité 2 — Expliquer un concept de votre stage

                    Choisissez un concept technique ou un outil que vous utilisez dans votre stage (ex : un langage de programmation, un logiciel, un processus). Demandez à une IA de vous l'expliquer comme si vous étiez débutant :

                    > « Explique-moi [concept/outil] en termes simples, comme si j'étais débutant. »

                    Est-ce que l'explication correspond à ce que vous savez déjà ? Y a-t-il des erreurs ?

                    ### Activité 3 — Faire générer un quizz par l'IA

                    Demandez à une IA de vous poser un quizz sur le contenu de ce document :

                    > « Je viens de lire un document sur l'IA couvrant : ce qu'est l'IA, les types d'IA, son fonctionnement, ses problèmes (biais, hallucinations, confidentialité) et les bonnes pratiques. Pose-moi 5 questions de quizz avec les réponses. »

                    Vérifiez si les questions et réponses générées sont correctes par rapport à ce que vous avez appris. L'IA a-t-elle bien compris les sujets ? Y a-t-il des erreurs ou des imprécisions ?

                    ---

                    ## Ressources

                    - [Gemini](https://gemini.google.com) — IA de Google (gratuit)
                    - [ChatGPT](https://chatgpt.com) — IA d'OpenAI (gratuit avec compte)
                    - [Claude](https://claude.ai) — IA d'Anthropic (gratuit avec compte)
                    """,
                Questions =
                [
                    new Question
                    {
                        ChapterTitle = "Chapitre 1 — C'est quoi l'IA ?",
                        Text = "Qu'est-ce que l'Intelligence Artificielle ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Un domaine de l'informatique qui crée des systèmes capables d'effectuer des tâches nécessitant normalement l'intelligence humaine", IsCorrect = true },
                            new QuestionOption { Text = "Un logiciel capable de remplacer entièrement l'être humain dans tous les domaines", IsCorrect = false },
                            new QuestionOption { Text = "Un réseau de stockage de données à très grande échelle", IsCorrect = false },
                        ],
                        Explanation = "L'IA vise à créer des systèmes qui effectuent des tâches normalement réservées à l'intelligence humaine, comme la reconnaissance vocale ou la prise de décision."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 1 — C'est quoi l'IA ?",
                        Text = "Dans quels domaines l'IA a-t-elle déjà démontré des capacités impressionnantes ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "La reconnaissance d'images, la traduction automatique et les jeux", IsCorrect = true },
                            new QuestionOption { Text = "La création artistique libre, l'empathie et la conscience de soi", IsCorrect = false },
                            new QuestionOption { Text = "La gestion d'entreprise complète et les décisions éthiques complexes", IsCorrect = false },
                        ],
                        Explanation = "L'IA excelle dans des domaines spécifiques comme la reconnaissance d'images, la traduction et les jeux, mais reste loin d'égaler l'intelligence humaine de façon générale."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 2 — Les différents types d'IA",
                        Text = "Parmi ces propositions, lesquelles sont des types d'IA mentionnés dans ce chapitre ?",
                        Type = "multiple",
                        Options =
                        [
                            new QuestionOption { Text = "IA de chat (conversation)", IsCorrect = true },
                            new QuestionOption { Text = "IA générative", IsCorrect = true },
                            new QuestionOption { Text = "IA de comptabilité", IsCorrect = false },
                            new QuestionOption { Text = "Agents IA", IsCorrect = true },
                        ],
                        Explanation = "Les types mentionnés sont : IA de chat, IA de reconnaissance d'images, IA de traduction automatique, IA générative, et agents IA. L'IA de comptabilité n'en fait pas partie."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 2 — Les différents types d'IA",
                        Text = "Quel type d'IA utilise-t-on quand on parle à un chatbot ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Une IA de conversation (IA de chat)", IsCorrect = true },
                            new QuestionOption { Text = "Une IA générative", IsCorrect = false },
                            new QuestionOption { Text = "Un agent IA", IsCorrect = false },
                        ],
                        Explanation = "Un chatbot utilise une IA de conversation, conçue spécifiquement pour simuler une conversation humaine."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 3 — Comment fonctionne l'IA ?",
                        Text = "Sur quoi repose l'apprentissage d'une IA ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Des algorithmes d'apprentissage automatique appliqués à de grandes quantités de données étiquetées", IsCorrect = true },
                            new QuestionOption { Text = "Des règles codées manuellement par des programmeurs pour chaque situation", IsCorrect = false },
                            new QuestionOption { Text = "Des bases de données encyclopédiques consultées en temps réel", IsCorrect = false },
                        ],
                        Explanation = "L'IA apprend à reconnaître des patterns à partir de grandes quantités de données étiquetées, grâce à des algorithmes d'apprentissage automatique."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 3 — Comment fonctionne l'IA ?",
                        Text = "Pour entraîner une IA à reconnaître des chiens, que faut-il lui fournir ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Des milliers d'images étiquetées avec le nom de l'animal représenté", IsCorrect = true },
                            new QuestionOption { Text = "Une description textuelle détaillée de ce qu'est un chien", IsCorrect = false },
                            new QuestionOption { Text = "Un programme listant toutes les caractéristiques physiques d'un chien", IsCorrect = false },
                        ],
                        Explanation = "On montre à l'IA des milliers d'images étiquetées — elle apprend à associer les caractéristiques visuelles aux bonnes étiquettes."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 4 — Les problèmes de l'IA",
                        Text = "Qu'est-ce qu'une hallucination dans le contexte de l'IA ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "L'IA génère des informations incorrectes ou inventées de manière convaincante", IsCorrect = true },
                            new QuestionOption { Text = "L'IA refuse de répondre à certaines questions sensibles", IsCorrect = false },
                            new QuestionOption { Text = "L'IA produit des images plutôt que du texte par erreur", IsCorrect = false },
                        ],
                        Explanation = "Une hallucination est un phénomène où l'IA génère des informations incorrectes ou inventées, souvent de façon convaincante, en raison de la nature probabiliste de ses algorithmes."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 4 — Les problèmes de l'IA",
                        Text = "Pourquoi les biais dans les données d'entraînement sont-ils problématiques ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Ils se retrouvent dans les résultats et peuvent mener à des décisions injustes", IsCorrect = true },
                            new QuestionOption { Text = "Ils ralentissent le temps de réponse des systèmes d'IA", IsCorrect = false },
                            new QuestionOption { Text = "Ils empêchent l'IA de traiter certaines langues", IsCorrect = false },
                        ],
                        Explanation = "Les biais présents dans les données d'entraînement se reproduisent dans les résultats, ce qui peut mener à des décisions injustes dans des contextes sensibles comme le recrutement ou la justice."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 4 — Les problèmes de l'IA",
                        Text = "Quel risque pose l'utilisation d'une IA avec des données personnelles ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Les données peuvent être collectées et utilisées par les serveurs hébergeant le modèle", IsCorrect = true },
                            new QuestionOption { Text = "L'IA peut accéder directement à votre compte bancaire", IsCorrect = false },
                            new QuestionOption { Text = "L'IA mémorise tout et peut vous reconnaître dans d'autres conversations", IsCorrect = false },
                        ],
                        Explanation = "La plupart des modèles tournent sur des serveurs distants. Les données fournies peuvent être utilisées à des fins diverses, posant des risques pour la confidentialité personnelle et professionnelle."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 5 — Comment bien utiliser l'IA ?",
                        Text = "Pourquoi ne faut-il pas partager des informations confidentielles avec une IA ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Les données peuvent être collectées ou utilisées par les serveurs hébergeant le modèle", IsCorrect = true },
                            new QuestionOption { Text = "L'IA pourrait publier les informations sur internet automatiquement", IsCorrect = false },
                            new QuestionOption { Text = "L'IA ne sait pas traiter les informations personnelles", IsCorrect = false },
                        ],
                        Explanation = "Les données partagées avec une IA peuvent être collectées ou utilisées par les serveurs hébergeant le modèle. Ne jamais partager mots de passe, données personnelles ou informations d'entreprise."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 5 — Comment bien utiliser l'IA ?",
                        Text = "Que doit-on faire avant de se fier à une information donnée par une IA ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "La vérifier auprès de sources fiables : experts, articles scientifiques, sites reconnus", IsCorrect = true },
                            new QuestionOption { Text = "La copier directement car les IA modernes font rarement des erreurs", IsCorrect = false },
                            new QuestionOption { Text = "Poser la même question à une deuxième IA pour confirmation", IsCorrect = false },
                        ],
                        Explanation = "Il faut toujours vérifier les informations auprès de sources fiables indépendantes. Ne jamais accepter une réponse d'IA sans vérification pour les informations importantes."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 6 — Le contexte",
                        Text = "Qu'est-ce que le « contexte » dans une conversation avec une IA ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "L'ensemble des informations disponibles pour l'IA au moment de répondre (message actuel, historique, documents fournis)", IsCorrect = true },
                            new QuestionOption { Text = "Le thème général du sujet traité, comme « informatique » ou « cuisine »", IsCorrect = false },
                            new QuestionOption { Text = "La langue dans laquelle on s'adresse à l'IA", IsCorrect = false },
                        ],
                        Explanation = "Le contexte, c'est toutes les informations disponibles pour l'IA au moment de répondre. Plus il est complet et clair, meilleure sera la réponse."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 6 — Le contexte",
                        Text = "Que se passe-t-il si une conversation dépasse la fenêtre de contexte de l'IA ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "L'IA « oublie » les parties les plus anciennes et peut sembler incohérente", IsCorrect = true },
                            new QuestionOption { Text = "L'IA s'arrête de répondre et demande d'ouvrir une nouvelle conversation", IsCorrect = false },
                            new QuestionOption { Text = "L'IA compresse automatiquement les anciennes réponses", IsCorrect = false },
                        ],
                        Explanation = "La fenêtre de contexte est limitée. Quand elle est pleine, les informations les plus anciennes sont perdues, ce qui peut créer des incohérences dans les réponses."
                    },
                    new Question
                    {
                        ChapterTitle = "Chapitre 6 — Le contexte",
                        Text = "Vous fermez une conversation et en ouvrez une nouvelle. L'IA se souvient-elle de l'ancienne ?",
                        Type = "single",
                        Options =
                        [
                            new QuestionOption { Text = "Non — chaque nouvelle conversation repart de zéro, sans souvenir des échanges précédents", IsCorrect = true },
                            new QuestionOption { Text = "Oui — l'IA garde un historique complet de toutes les conversations", IsCorrect = false },
                            new QuestionOption { Text = "Oui — si vous utilisez le même compte, elle se souvient automatiquement", IsCorrect = false },
                        ],
                        Explanation = "Par défaut, chaque nouvelle conversation repart de zéro. Il faut redonner le contexte nécessaire au début de chaque nouvelle conversation."
                    },
                ],
            },
            new Workshop
            {
                Title = "Modèles de langage avancés",
                Description = "Explorer le fonctionnement interne des LLM et leurs limites.",
                Type = WorkshopType.Theory,
                Level = WorkshopLevel.Advanced,
                Track = "Formation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 60,
                ContentFr = "## Contenu\n\nCet atelier approfondit les LLM."
            },
            new Workshop
            {
                Title = "Premier prompt",
                Description = "Rédiger et tester son premier prompt avec un assistant IA.",
                Type = WorkshopType.Exercise,
                Level = WorkshopLevel.Introduction,
                Track = "Formation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 45,
                ContentFr = "## Exercice\n\nRédigez un prompt pour obtenir une réponse précise."
            },
            new Workshop
            {
                Title = "Fine-tuning d'un modèle",
                Description = "Adapter un modèle pré-entraîné à un cas métier spécifique.",
                Type = WorkshopType.Exercise,
                Level = WorkshopLevel.Advanced,
                Track = "Formation",
                Authors = ["Formateur ORIF"],
                EstimatedDuration = 120,
                ContentFr = "## Exercice\n\nAppliquez le fine-tuning sur un jeu de données fourni."
            },
        ]);
    }
}
