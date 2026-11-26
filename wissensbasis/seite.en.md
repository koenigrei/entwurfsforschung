## What this is about

Every project in the AI Lab leaves more behind than an app: the source code with tests, a description of the method, lessons on what works and what does not, and the workflows that were followed. Together they form a knowledge base. A coding agent such as Claude Code reads it in a few minutes and builds on it instead of starting from scratch: it knows the precedents, the checks, the pitfalls and the rules that have proven themselves.

This page shows how to use the knowledge base for a new project. The package above contains all overarching files; the source packages of the individual projects can be added as needed.

## What there is

| Building block | Where | What for |
|---|---|---|
| Apps | tiles in the [AI Lab](../../) | look, try out, generate variants |
| Source package per app | in the app under “Source code · Develop further”, overview below | code, tests, `README.md`, `AGENTS.md`, mostly also `QUELLE.md` and `METHODE.md` |
| `METHODE.md` per project | [Methods](../methode/), in the package under `methoden/projekte/` | question, precedents and sources, representation, corpus, generator, checks, style, what works, pitfalls, open points |
| Method catalogue | in the package `methoden/README.md` | index of all projects, comparison, how the methods capture style, lessons across all studies |
| Template | in the package `methoden/VORLAGE_METHODE.md` | outline for the METHODE.md of a new project |
| Skills | in the package `.claude/skills/<name>/SKILL.md` | workflows the agent loads before it takes on a kind of task |
| Recipes | in the package `rezepte/` | how old programs and Grasshopper modules became series of web apps |
| Start file | in the package `AGENTS.md` and `CLAUDE.md` | tells the agent what to read first and which rules apply |

A **skill** is a short instruction in a file `SKILL.md`: name and description of when it applies at the top, the workflow below. Claude Code finds skills in the project folder `.claude/skills/` and loads one as soon as a task matches its description. Other coding agents such as Codex or Gemini CLI read `AGENTS.md` and, from there, the matching `SKILL.md` as an instruction.

The files in the package are in German; coding agents read them without trouble.

## Projects and their packages

{{PROJEKTE}}

## Starting a new project

1. **Download the package:** download [KI-Lab_Wissensbasis.zip](KI-Lab_Wissensbasis.zip) and unpack it.
2. **Create a project folder** and put the contents of the folder `KI-Lab_Wissensbasis/` into it. The folder `.claude/` is hidden and must come along (Windows Explorer: View › Show › Hidden items).
3. **Add precedents** (as needed): unpack the source package of the one or two most closely related projects into a subfolder `vorbilder/<project>/`.
4. **Set up Git** (`git init`) so that every step stays traceable and reversible.
5. **Start the agent:** open the folder in VS Code or a terminal and start the agent there, e.g. `claude` for Claude Code. Claude Code reads `CLAUDE.md`, which includes `AGENTS.md`; Codex and others read `AGENTS.md` directly.
6. **Begin with a question,** not an assignment: the agent reads first and reports what it would take over.

## Example: a new generative study

Suppose a study is to generate terraced houses in the style of a 1920s housing estate. The closest projects in the Lab are the shape grammars Duarte/Siza and Palladio in the [Shape Grammar Study](../formgrammatik/). The workflow can look like this; each prompt is a stage, after which the result is reviewed. The prompts can be written in English just as well.

### 1 · Get oriented, change nothing

```
Read AGENTS.md, methoden/README.md and PROJEKTE.md. My question: can the style of the terraced houses of the <name> estate be captured as a generator? Which two or three projects of the AI Lab are closest? Read their METHODE.md and summarise what I can take over and which pitfalls I should avoid. Do not change anything yet.
```

### 2 · Plan following the skill

```
Use the skill generative-studie. Write a plan in PLAN.md: question, precedents and sources with DOI, corpus with selection rules, representation, checks, generator, app. Mark what is documented and what is an assumption. Wait for my OK.
```

### 3 · Corpus and checks first

```
Download the source package of the Shape Grammar Study (link in PROJEKTE.md) into vorbilder/formgrammatik/; Duarte/Siza is in it under konzepte/2026-11-20_Experiment_Siza_Malagueira/. Set up our corpus in the same format the generator will use (model: korpus/katalog.json and prototyp/korpus.js in the package). Write the checker with tests: key figures of the originals and hard rules. Show me the key figures of the originals as a table.
```

### 4 · Generator with a seed

```
Write the generator following the pattern “grammar as genes with a seed and a visible derivation” from the METHODE.md of Duarte/Siza: same seed, same house. Run 200 seeds through the checker, report the hit rate and the three largest differences from the originals, and fix them in the generator, not in the checker.
```

### 5 · App for viewing

```
Build an app as a single HTML file: an image wall of many variants, a detail view with the derivation, German and English, dark and light, author line and licence, no content from third-party servers. Check it in the browser at 1440 and 390 px width and show me screenshots.
```

### 6 · Feed back

```
Use the skill methode-dokumentieren: write METHODE.md following methoden/VORLAGE_METHODE.md, using only facts from our files and figures with dates, and propose a row for the table “Projekte” in methoden/README.md.
```

After each stage: review the results yourself, run the tests, record decisions with a date (the agent writes them into `STAND.md`).

## Continuing an existing app

For smaller plans the source package of a single app is enough, for instance to extend the generator of the Palladio tab of the [Shape Grammar Study](../formgrammatik/formgrammatik.html#tab:palladio) by a rule or to apply [Procedural Cities](../procedural-cities/) to different terrain. Unpack the package, put the skill `lab-projekt-weiterentwickeln` from the knowledge base into `.claude/skills/` and begin like this:

```
Read README.md, AGENTS.md and METHODE.md. Explain the structure to me, run the tests and tell me which rules must not break. Do not change anything.
```

## Feeding results back

A knowledge base only grows if new projects give their knowledge back:

- **METHODE.md** in the new project following the template, with all sections; “still open” is an allowed answer.
- **Catalogue row** for the table “Projekte” in `methoden/README.md`; new lessons across studies under “Was über alle Studien trägt”.
- **Package** of the new project with `README.md`, `AGENTS.md`, `METHODE.md`, tests and licence, so that others can continue there.

To contribute a project to the AI Lab, send METHODE.md and the catalogue row to the Chair InfAU at Bauhaus-Universität Weimar (contact in the [legal notice](../../impressum/)).

## Limits

- **Check quality:** agents are wrong with the same confidence with which they are right. Look at results, run tests, read the changes. A checker measures only what it measures; a blind judgement by people is still missing in all studies.
- **Figures age:** the METHODE.md files give measurements with dates. Measure again before quoting.
- **Sources:** facts only from files and documented sources with author, year and DOI. What the agent “knows” without evidence does not belong in a METHODE.md.
- **Licences:** contents of the AI Lab are under CC BY 4.0 with the attribution “Prof. Dr. Reinhard König in Zusammenarbeit mit Claude von Anthropic” (in collaboration with Claude by Anthropic). Originals by others have their own licences (in the packages under `QUELLE.md` and `LICENSE.md`). Third-party plans stay local; licensed cost data such as BKI figures are in no package.
- **No credentials:** API keys only in environment variables, never in files, prompts, commits or packages.
- **No personal data:** no data of students or third parties in prompts and repositories.
- **Recipes:** they describe work in the website repository, whose tools are not in the package; the `quellcode.zip` of an existing app serves as template for a new one.

## Contents of the package

As of {{STAND}}. The package is assembled from the current sources at every build of the website and checked for private information (paths with user names, e-mail addresses, access keys, memory files). The files can also be viewed one by one; for that the skills are under `skills/`, in the package under `.claude/skills/`.

{{DATEIEN}}

{{ANPASSUNGEN}}
