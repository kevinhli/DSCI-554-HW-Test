## Writing Your Visualization Paper: A Step-by-Step Guide

This guide will walk you through setting up your project in Overleaf, using LaTeX, and structuring your paper for success.

### 1. Project Requirements Overview

Your final paper is a core part of this project. It must:

* Use the **Springer Lecture Notes in Computer Science (LNCS)** template.
* Be written via **Overleaf** and submitted as a PDF.
* Include the following sections:
  * Title
  * Authors (LNCS template)
  * Abstract (LNCS template)
  * Introduction
  * Related Work
  * Data
  * Design and Implementation
  * Usage Scenarios and Results
  * Conclusion
  * References

### 2. Getting Started with Overleaf

[Overleaf](https://www.overleaf.com) is an online LaTeX editor that we'll use for this project. It's like Google Docs for scientific papers.

1. **Register:** Create your free account at [overleaf.com/register](https://www.overleaf.com/register) **using your USC ID**.
2. **Get the Template:**
    * Go to the [LNCS Template page](https://www.overleaf.com/latex/templates/springer-lecture-notes-in-computer-science/kzwwpvhwnvbf).
    * Click `Open as Template`.
3. **Rename & Share:**
    * Once the project opens, click the ✎ icon next to the title at the top to rename it (e.g., "Vis Project - Team DataWizards").
    * Click the `Share` button in the top right.
    * **To share with your team:** Enter your teammates' email addresses to give them `Can Edit` access.
    * **To submit for review:** Click `Turn on link sharing`. Copy the **"Anyone with this link can view"** link (**not** the edit link) and paste it into your `SUBMISSION.md` file in your project repository.

### 3. Essential LaTeX & Writing Tips

Essential LaTeX and writing tips you will need to write and format your paper.

#### ✍️ Citing Sources (Don't just copy-paste links!)

All citations go in the `mybibliography.bib` file.

* **For Academic Papers (from Google Scholar):**
    1. Find your paper on [Google Scholar](https://scholar.google.com/).
    2. Click the **`＂ Cite`** icon under the paper.
    3. In the pop-up, click **`BibTeX`**.
    4. Copy the entire block of text (e.g., `@article{...}`) and paste it into your `mybibliography.bib` file. Use a style consistent with your other citations.
    5. In your main `.tex` file, you can cite this paper using its key (e.g., `\cite{ware2004information}`).

* **For Websites (like D3.js, blogs, etc.):**
    You need to create a `@misc` entry in your `mybibliography.bib` file. See the `d3_url` entry for an example. Here's a template:

    ```bibtex
    @misc{YourKeyHere,
      author = {Author's Name (or Organization)},
      title = {Title of the Webpage},
      howpublished = {\url{[https://full.url.here/](https://full.url.here/)}},
      year = {Year Accessed},
      note = {Accessed: YYYY-MM-DD}
    }
    ```

#### 🖼️ Adding Images (Figures)

1. Upload your `.png` (preferred) or `.jpeg` file to the Overleaf project (click the "Upload" button).
2. In your `.tex` file, use a `figure` environment. **Ignore the `.eps` example in the template; use `.png`.**

    > **Quick Example (paste this in your text):**
    >
    > ```tex
    > \begin{figure}
    >   \centering
    >   \includegraphics[width=0.8\textwidth]{your-filename.png}
    >   \caption{This is the caption for my figure.}
    >   \label{fig:my-figure}
    > \end{figure}
    > ```
    >
    > * `width=0.8\textwidth` scales the image to 80% of the text width.
    > * `your-filename.png` must match the file you uploaded **exactly**.
    > * `\label{fig:my-figure}` creates a label you can reference in your text (e.g., "As shown in Fig.~\ref{fig:my-figure}, ...").

#### 📊 Adding Tables

* Making tables in LaTeX by hand is tricky.
* **Pro-tip:** Use the [Overleaf Tables Introduction](https://www.overleaf.com/learn/latex/Tables#Introduction) to copy a basic example, or use an online **LaTeX Table Generator** (like [tablesgenerator.com](https://www.tablesgenerator.com/)) to paste your data and get a "Booktabs" style table. Another option is to use Gen AI to produce the LaTex.

### 4. Your Paper's Structure & Content

Here is the section-by-section breakdown. Initially, use bullet points as a **checklist** to ensure you've covered everything in your text.

```tex
% --- TITLE, AUTHORS, ETC. ---
% Fill in the \title{}, \author{}, and \institute{} commands at the
% top of the .tex file. Make sure your team members are listed.

% --- ABSTRACT ---
% Write this section LAST, after you've written everything else.

\begin{abstract}
The abstract is a short (150 to 250-word) summary of your \emph{entire} paper. It should answer:
\begin{enumerate}
    \item What is the problem/motivation? (1-2 sentences)
    \item What did you do? (1-2 sentences)
    \item What are the key contributions and/or results? (1-2 sentences)
\end{enumerate}
\end{abstract}

% --- INTRODUCTION ---
\section{Introduction}
\label{introduction}
% This is where you grab the reader's attention.
\begin{itemize}
    \item Start with your **motivation***. Why is this topic important? Why does it need a visualization? (The "hook")
    \item Explain the **scope** of your project. Who is the target **user** or audience? How would it be useful to them?
    \item What is the core **visualization challenge** or novel aspect? (e.g., "The challenge is visualizing 5-dimensional data over time for non-experts...")
    \item \textbf{Briefly state your key contributions}. (e.g., "Our contributions are (1) a novel visualization form..., (2) a daisy map..., (3) a modern dashboard...")
    \item Add a "roadmap" paragraph: "The rest of this paper is organized as follows. Section 2 reviews related work..."
\end{itemize}

% --- RELATED WORK ---
\section{Related Work}
\label{related-work}
% This section proves you've done your research.
% Do NOT just list summaries. Group papers by theme.
\begin{itemize}
    \item Explain what others have done on **your specific topic**. (e.g., "Several systems exist for visualizing stock market data...")
    \item Explain what others have done in **other relevant areas**. (e.g., "Our work also draws on research in hierarchical data visualization...")
    \item For each group of papers, explain how your work **fits in, differs, or improves** upon theirs. (e.g., "While system X provides an overview, our tool focuses on drill-down analysis...")
\end{itemize}

% --- DATA ---
\section{Data}
\label{data}
% What data did you use, and what should users be able to DO with it? If you created a synthetic dataset, that could be a contribution.
\begin{itemize}
    \item Explain your **dataset(s)**. Are they synthetic? Where did it come from? How big is it? What are the key attributes (e.g., numerical, categorical, temporal)?
    \item Describe the tools and process used to **create or clean the data**.
    \item Provide a summary table, and/or if this is novel synthetic data, you can provide a figure to explain it.
\end{itemize}

% --- DESIGN AND IMPLEMENTATION ---
\section{Design and Implementation}
\label{design}
% This is the core of your paper. How and WHY did you build it?
\begin{itemize}
    \item **Design Process & Rationale:** Walk through your design process. Why did you choose a specific layout, charts, colors, and interactions? Justify your choices based on visualization principles.
    \item **Implementation:** What **technologies** did you use (e.g., D3, Vue, Observable, Python)? Why were they the right choice for your project?
    \item **GenAI Usage:** Explain how you used GenAI in your **design or coding process** (e.g., "We used GPT-4 to brainstorm design layouts and to help debug D3.js code...").
    \item **Challenges:** What was difficult? (e.g., "A key challenge was handling data occlusion...") How did you address it?
    \item Provide figures if a novel design and/or references to design documents.
\end{itemize}

% --- USAGE SCENARIOS AND RESULTS ---
\section{Usage Scenarios and Results}
\label{demo}
% Show your visual display in action!
\begin{itemize}
    \item Define **use cases" and "scenarios** for the visual displays you have created.
    \item **Use figures (screenshots) heavily here!**
    \item Highlight your **contributions**. This is where you *show* (don't just tell) the value of your work.
\end{itemize}

% --- CONCLUSION ---
\section{Conclusion}
\label{conclusion}
% Wrap it all up.
\begin{itemize}
    \item Briefly **summarize** your project and its main contributions.
    \item Be honest about your project's **limitations**. (e.g., "Our tool currently only supports...").
    \item Suggest ideas for **future work**. What would you do next if you had more time?
\end{itemize}
```
