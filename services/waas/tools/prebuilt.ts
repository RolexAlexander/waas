
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import { Agent } from '../Agent';
import { Tool } from './Tool';
import { Task, TaskStatus, EnvironmentState, ToolResult } from '../../../types';
import { useWaaSStore } from '../../../store/waasStore';
import { FunctionDeclaration, Type } from '@google/genai';

const createToolResult = (newState: EnvironmentState, eventName: string | null, eventData: any, taskResult: any): ToolResult => {
    return {
        newState,
        event: eventName ? { name: eventName, data: eventData } : null,
        taskResult
    };
};

// =================================================================
// == GENERIC TOOLS
// =================================================================

export const WebSearchTool: Tool = {
  name: "web_search",
  description: "Searches the web for a given query to find up-to-date information. Use for research on topics, concepts, or facts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
        query: { type: Type.STRING, description: 'The query to search the web for.' },
    },
    required: ['query'],
  },
  async execute(args: { query: string }, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult> {
    console.log(`[Tool:web_search] Searching for: "${args.query}"`);
    const response = await agent.llmService.generateResponse(args.query, agent.name, undefined, false);
    const text = response.text || "No summary text returned from search.";
    const result = { summary: text, sources: [] };
    return createToolResult(environmentState, 'web_searched', args, result);
  },
};

export const HumanInputTool: Tool = {
  name: "human_input_research",
  description: "Asks the human user for input, analysis, or information when the answer is subjective or requires deep domain expertise. Use as a last resort.",
  parameters: {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: 'The specific question to ask the human user.' },
    },
    required: ['question'],
  },
  async execute(args: { question: string }, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult> {
    console.log(`[Tool:human_input_research] Requesting human input for: "${args.question}"`);
    useWaaSStore.getState().requestHumanInput({
        question: args.question, taskId: task.id, agentName: agent.name,
    });
    agent.orchestrator.updateTask(produce(task, draft => {
        draft.status = TaskStatus.AWAITING_INPUT;
        draft.history.push({ status: TaskStatus.AWAITING_INPUT, timestamp: Date.now(), message: `Waiting for human input for question: "${args.question}"`});
    }));
    return createToolResult(environmentState, null, {}, { "waas_internal_status": "AWAITING_HUMAN_INPUT" });
  },
};

export const ConversationTool: Tool = {
  name: "start_conversation",
  description: "Initiates an interactive, multi-turn conversation (a meeting) with specified participants to solve a complex problem. Only use if a task is blocked and simple retry is not an option.",
  parameters: {
    type: Type.OBJECT,
    properties: {
        problem: { type: Type.STRING, description: 'A clear and concise description of the problem to be solved in the conversation.' },
        participants: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of agent names to invite to the conversation.' },
    },
    required: ['problem', 'participants'],
  },
  async execute(args: { problem: string; participants: string[] }, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult> {
    console.log(`[Tool:start_conversation] Initiating for problem: "${args.problem}"`);
    const allParticipants = [agent.name, ...args.participants.filter(p => p !== agent.name)];
     const updatedTask = produce(task, draft => {
        draft.status = TaskStatus.BLOCKED;
        draft.history.push({ status: TaskStatus.BLOCKED, timestamp: Date.now(), message: `Task blocked. A conversation has been called to resolve: "${args.problem}"`});
    });
    agent.orchestrator.updateTask(updatedTask);
    agent.orchestrator.conversationManager.startConversation(task.id, args.problem, allParticipants);
    return createToolResult(environmentState, null, {}, { "waas_internal_status": "CONVERSATION_STARTED" });
  },
};

// =================================================================
// == STORYBOOK STUDIO TOOLS
// =================================================================
export const CreateStoryOutlineTool: Tool = {
  name: "create_story_outline",
  description: "Takes a story concept and creates a new book object in the environment with a title and a chapter-by-chapter outline.",
  parameters: { type: Type.OBJECT, properties: { concept: { type: Type.STRING, description: 'The high-level concept for the story.' } }, required: ['concept'] },
  async execute(args: { concept: string }, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult> {
    const prompt = `Based on the concept: "${args.concept}", create a compelling book title and a chapter-by-chapter outline. Call 'save_outline' with the result.`;
    const saveOutlineTool: FunctionDeclaration = {
        name: 'save_outline', description: 'Saves the book title and chapter outline.',
        parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, outline: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['title', 'outline'] }
    };
    const response = await agent.llmService.generateResponse(prompt, agent.name, [saveOutlineTool], true);
    if (response.functionCall?.name === 'save_outline') {
        const { title, outline } = response.functionCall.args;
        const bookId = uuidv4();
        const newState = produce(environmentState, draft => {
            draft.books.push({ id: bookId, title, status: 'WRITING', outline, chapters: [] });
        });
        return createToolResult(newState, 'outline_created', { bookId, title }, { bookId, title, outline });
    }
    throw new Error("LLM did not call the 'save_outline' tool.");
  },
};

export const WriteChapterTool: Tool = {
  name: "write_chapter",
  description: "Writes the full text for a specific chapter of a book, given the book ID and chapter title.",
  parameters: { type: Type.OBJECT, properties: { bookId: { type: Type.STRING }, chapterTitle: { type: Type.STRING } }, required: ['bookId', 'chapterTitle'] },
  async execute(args: { bookId: string; chapterTitle: string }, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult> {
    const book = environmentState.books.find((b: any) => b.id === args.bookId);
    if (!book) return createToolResult(environmentState, null, {}, { error: `Book with ID ${args.bookId} not found.` });
    const prompt = `Write the full content for chapter "${args.chapterTitle}" of the book "${book.title}". Story outline: ${book.outline.join(', ')}. ONLY output chapter text.`;
    const response = await agent.llmService.generateResponse(prompt, agent.name);
    const chapterContent = response.text || "No content returned.";
    const newChapter = { title: args.chapterTitle, content: chapterContent, illustrations: [] };
    const newState = produce(environmentState, draft => {
        draft.books.find((b: any) => b.id === args.bookId)?.chapters.push(newChapter);
    });
    return createToolResult(newState, 'chapter_written', { bookId: args.bookId, chapterTitle: args.chapterTitle }, newChapter);
  },
};

export const CreateIllustrationsTool: Tool = {
  name: "create_illustrations",
  description: "Creates one whimsical, children's storybook style illustration for a given chapter's content.",
  parameters: { type: Type.OBJECT, properties: { bookId: { type: Type.STRING }, chapterTitle: { type: Type.STRING } }, required: ['bookId', 'chapterTitle'] },
  async execute(args: { bookId: string; chapterTitle: string }, agent: Agent, task: Task, environmentState: EnvironmentState): Promise<ToolResult> {
    const book = environmentState.books.find((b: any) => b.id === args.bookId);
    if (!book) return createToolResult(environmentState, null, {}, { error: `Book ID ${args.bookId} not found.` });
    const chapter = book.chapters.find((c: any) => c.title === args.chapterTitle);
    if (!chapter) return createToolResult(environmentState, null, {}, { error: `Chapter "${args.chapterTitle}" not found.` });
    const prompt = `A whimsical children's storybook illustration for a chapter titled "${chapter.title}". Scene: ${chapter.content.substring(0, 400)}...`;
    const images = await agent.llmService.generateImages(prompt, agent.name, 1);
    const newState = produce(environmentState, draft => {
        const chapterToUpdate = draft.books.find((b: any) => b.id === args.bookId)?.chapters.find((c: any) => c.title === args.chapterTitle);
        if (chapterToUpdate) chapterToUpdate.illustrations = images;
    });
    return createToolResult(newState, 'illustrations_created', { bookId: args.bookId, chapterTitle: args.chapterTitle, imageCount: images.length }, images);
  },
};

export const PublishBookTool: Tool = {
    name: "publish_book",
    description: "Finalizes a book by changing its status to 'PUBLISHED'.",
    parameters: { type: Type.OBJECT, properties: { bookId: { type: Type.STRING } }, required: ['bookId'] },
    async execute({ bookId }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            const book = draft.books.find((b:any) => b.id === bookId);
            if (book) book.status = 'PUBLISHED';
        });
        const book = newState.books.find((b:any) => b.id === bookId);
        return createToolResult(newState, 'book_published', { bookId, title: book?.title }, { success: true });
    },
};

export const ListBooksTool: Tool = {
    name: "list_books",
    description: "Lists all books currently in the bookshelf environment.",
    parameters: { type: Type.OBJECT, properties: {} },
    async execute(args, agent, task, state): Promise<ToolResult> {
        const bookList = state.books.map((b:any) => ({ id: b.id, title: b.title, status: b.status }));
        return createToolResult(state, null, {}, bookList);
    },
};

export const GetBookDetailsTool: Tool = {
    name: "get_book_details",
    description: "Gets the full details of a single book by its ID.",
    parameters: { type: Type.OBJECT, properties: { bookId: { type: Type.STRING } }, required: ['bookId'] },
    async execute({ bookId }, agent, task, state): Promise<ToolResult> {
        const book = state.books.find((b:any) => b.id === bookId);
        return createToolResult(state, null, {}, book || { error: `Book ${bookId} not found.`});
    },
};

export const DeleteBookTool: Tool = {
    name: "delete_book",
    description: "Deletes a book from the bookshelf.",
    parameters: { type: Type.OBJECT, properties: { bookId: { type: Type.STRING } }, required: ['bookId'] },
    async execute({ bookId }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            draft.books = draft.books.filter((b:any) => b.id !== bookId);
        });
        return createToolResult(newState, 'book_deleted', { bookId }, { success: true });
    },
};

// =================================================================
// == AGILE INNOVATORS TOOLS
// =================================================================

export const ListFilesTool: Tool = {
    name: "list_files",
    description: "Lists all files in the git repository.",
    parameters: { type: Type.OBJECT, properties: {} },
    async execute(args, agent, task, state): Promise<ToolResult> {
        return createToolResult(state, null, {}, state.files.map((f:any) => f.filename));
    },
};

export const ReadFileContentTool: Tool = {
    name: "read_file_content",
    description: "Reads the content of a specific file.",
    parameters: { type: Type.OBJECT, properties: { filename: { type: Type.STRING } }, required: ['filename'] },
    async execute({ filename }, agent, task, state): Promise<ToolResult> {
        const file = state.files.find((f:any) => f.filename === filename);
        return createToolResult(state, null, {}, file || { error: `File ${filename} not found.` });
    },
};

export const WriteCodeTool: Tool = {
    name: "write_code",
    description: "Writes or overwrites a file with new code.",
    parameters: { type: Type.OBJECT, properties: { filename: { type: Type.STRING }, code: { type: Type.STRING } }, required: ['filename', 'code'] },
    async execute({ filename, code }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            const fileIndex = draft.files.findIndex((f:any) => f.filename === filename);
            if (fileIndex > -1) {
                draft.files[fileIndex].code = code;
            } else {
                draft.files.push({ filename, code });
            }
        });
        return createToolResult(newState, 'code_written', { filename }, { success: true });
    },
};

export const PlanFeatureTool: Tool = {
    name: "plan_feature",
    description: "Generates a technical specification for a new feature.",
    parameters: { type: Type.OBJECT, properties: { feature_description: { type: Type.STRING } }, required: ['feature_description'] },
    async execute({ feature_description }, agent, task, state): Promise<ToolResult> {
        const prompt = `Generate a technical specification for the feature: "${feature_description}". Include key files to create and logic to implement.`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        return createToolResult(state, 'feature_planned', { feature_description }, { spec: response.text });
    },
};

export const CreatePullRequestTool: Tool = {
    name: "create_pull_request",
    description: "Creates a pull request for a feature.",
    parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['title', 'description'] },
    async execute({ title, description }, agent, task, state): Promise<ToolResult> {
        const prId = state.pull_requests.length + 1;
        const newState = produce(state, draft => {
            draft.pull_requests.push({ id: prId, title, description, status: 'OPEN' });
        });
        return createToolResult(newState, 'pr_created', { prId, title }, { pullRequestId: prId });
    },
};

export const RunTestsTool: Tool = {
    name: "run_tests",
    description: "Runs simulated tests against the codebase for a pull request.",
    parameters: { type: Type.OBJECT, properties: { pullRequestId: { type: Type.NUMBER } }, required: ['pullRequestId'] },
    async execute({ pullRequestId }, agent, task, state): Promise<ToolResult> {
        // This is a simplified simulation
        const newState = produce(state, draft => {
            const pr = draft.pull_requests.find((p:any) => p.id === pullRequestId);
            if (pr) pr.status = 'TESTS_PASSED';
        });
        return createToolResult(newState, 'tests_run', { pullRequestId }, { tests_passed: true });
    },
};

export const MergePullRequestTool: Tool = {
    name: "merge_pr",
    description: "Merges a pull request into the main branch.",
    parameters: { type: Type.OBJECT, properties: { pullRequestId: { type: Type.NUMBER } }, required: ['pullRequestId'] },
    async execute({ pullRequestId }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            const pr = draft.pull_requests.find((p:any) => p.id === pullRequestId);
            if (pr && pr.status === 'TESTS_PASSED') {
                pr.status = 'MERGED';
            }
        });
        return createToolResult(newState, 'pr_merged', { pullRequestId }, { merged: true });
    },
};

// =================================================================
// == AD AGENCY TOOLS
// =================================================================

export const GetCampaignBriefTool: Tool = {
    name: "get_campaign_brief",
    description: "Gets the current state of the campaign brief.",
    parameters: { type: Type.OBJECT, properties: {} },
    async execute(args, agent, task, state): Promise<ToolResult> {
        return createToolResult(state, null, {}, state);
    },
};

export const DevelopAdConceptTool: Tool = {
    name: "develop_ad_concept",
    description: "Develops a creative concept for an ad campaign.",
    parameters: { type: Type.OBJECT, properties: { product: { type: Type.STRING } }, required: ['product'] },
    async execute({ product }, agent, task, state): Promise<ToolResult> {
        const prompt = `Develop a creative, catchy ad concept for a product called "${product}".`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        const newState = produce(state, draft => {
            draft.concept = response.text;
        });
        return createToolResult(newState, 'concept_developed', { product }, { concept: response.text });
    },
};

export const CreateAdCopyTool: Tool = {
    name: "create_ad_copy",
    description: "Writes ad copy based on the approved concept.",
    parameters: { type: Type.OBJECT, properties: {} },
    async execute(args, agent, task, state): Promise<ToolResult> {
        if (!state.concept) return createToolResult(state, null, {}, { error: "No concept developed yet." });
        const prompt = `Write compelling ad copy based on this concept: "${state.concept}".`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        const newState = produce(state, draft => {
            draft.copy = response.text;
        });
        return createToolResult(newState, 'copy_created', {}, { copy: response.text });
    },
};

export const DesignVisualsTool: Tool = {
    name: "design_visuals",
    description: "Creates visual assets for the ad campaign.",
    parameters: { type: Type.OBJECT, properties: { num_visuals: { type: Type.NUMBER } }, required: ['num_visuals'] },
    async execute({ num_visuals }, agent, task, state): Promise<ToolResult> {
        if (!state.concept) return createToolResult(state, null, {}, { error: "No concept developed yet." });
        const prompt = `A professional, high-quality visual for an ad campaign with the concept: "${state.concept}".`;
        const images = await agent.llmService.generateImages(prompt, agent.name, num_visuals);
        const newState = produce(state, draft => {
            draft.visuals = images;
        });
        return createToolResult(newState, 'visuals_created', { count: images.length }, { visuals: images });
    },
};

// =================================================================
// == MARKET INSIGHTS TOOLS
// =================================================================

export const CreateReportTool: Tool = {
    name: "create_report",
    description: "Creates a new, empty research report.",
    parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING } }, required: ['title'] },
    async execute({ title }, agent, task, state): Promise<ToolResult> {
        const reportId = uuidv4();
        const newState = produce(state, draft => {
            draft.reports.push({ id: reportId, title, sections: {} });
        });
        return createToolResult(newState, 'report_created', { reportId, title }, { reportId });
    },
};

export const ListReportsTool: Tool = {
    name: "list_reports",
    description: "Lists all available research reports.",
    parameters: { type: Type.OBJECT, properties: {} },
    async execute(args, agent, task, state): Promise<ToolResult> {
        const reportList = state.reports.map((r:any) => ({ id: r.id, title: r.title }));
        return createToolResult(state, null, {}, reportList);
    },
};

export const GetReportDetailsTool: Tool = {
    name: "get_report_details",
    description: "Gets the full details of a single research report.",
    parameters: { type: Type.OBJECT, properties: { reportId: { type: Type.STRING } }, required: ['reportId'] },
    async execute({ reportId }, agent, task, state): Promise<ToolResult> {
        const report = state.reports.find((r:any) => r.id === reportId);
        return createToolResult(state, null, {}, report || { error: `Report ${reportId} not found.`});
    },
};

export const UpdateReportSectionTool: Tool = {
    name: "update_report_section",
    description: "Adds or updates a section in a research report.",
    parameters: { type: Type.OBJECT, properties: { reportId: { type: Type.STRING }, section_title: { type: Type.STRING }, content: { type: Type.STRING } }, required: ['reportId', 'section_title', 'content'] },
    async execute({ reportId, section_title, content }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            const report = draft.reports.find((r:any) => r.id === reportId);
            if (report) report.sections[section_title] = content;
        });
        return createToolResult(newState, 'report_updated', { reportId, section_title }, { success: true });
    },
};

export const AnalyzeDataTool: Tool = {
    name: "analyze_data",
    description: "Analyzes raw text data to find insights.",
    parameters: { type: Type.OBJECT, properties: { data: { type: Type.STRING } }, required: ['data'] },
    async execute({ data }, agent, task, state): Promise<ToolResult> {
        const prompt = `Analyze the following data and provide a summary of key insights:\n\n${data}`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        return createToolResult(state, 'data_analyzed', {}, { analysis: response.text });
    },
};

export const SummarizeFindingsTool: Tool = {
    name: "summarize_findings",
    description: "Summarizes all sections of a report into a conclusion.",
    parameters: { type: Type.OBJECT, properties: { reportId: { type: Type.STRING } }, required: ['reportId'] },
    async execute({ reportId }, agent, task, state): Promise<ToolResult> {
        const report = state.reports.find((r:any) => r.id === reportId);
        if (!report) return createToolResult(state, null, {}, { error: `Report ${reportId} not found.`});
        const prompt = `Summarize the findings from this report into a conclusion:\n\n${JSON.stringify(report.sections, null, 2)}`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        return createToolResult(state, 'findings_summarized', { reportId }, { summary: response.text });
    },
};

// =================================================================
// == BLOG FARM TOOLS
// =================================================================

export const ListArticlesTool: Tool = {
    name: "list_articles",
    description: "Lists all articles in the CMS.",
    parameters: { type: Type.OBJECT, properties: {} },
    async execute(args, agent, task, state): Promise<ToolResult> {
        const articleList = state.articles.map((a:any) => ({ id: a.id, title: a.title, status: a.status }));
        return createToolResult(state, null, {}, articleList);
    },
};

export const GetArticleContentTool: Tool = {
    name: "get_article_content",
    description: "Gets the content of a specific article.",
    parameters: { type: Type.OBJECT, properties: { articleId: { type: Type.STRING } }, required: ['articleId'] },
    async execute({ articleId }, agent, task, state): Promise<ToolResult> {
        const article = state.articles.find((a:any) => a.id === articleId);
        return createToolResult(state, null, {}, article || { error: `Article ${articleId} not found.` });
    },
};

export const WriteArticleTool: Tool = {
    name: "write_article",
    description: "Writes a new article on a given topic.",
    parameters: { type: Type.OBJECT, properties: { topic: { type: Type.STRING } }, required: ['topic'] },
    async execute({ topic }, agent, task, state): Promise<ToolResult> {
        const prompt = `Write a blog article about "${topic}".`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        const articleId = uuidv4();
        const newState = produce(state, draft => {
            draft.articles.push({ id: articleId, title: topic, content: response.text, status: 'DRAFT' });
        });
        return createToolResult(newState, 'article_written', { articleId, topic }, { articleId });
    },
};

export const EditArticleTool: Tool = {
    name: "edit_article",
    description: "Edits an existing article based on feedback.",
    parameters: { type: Type.OBJECT, properties: { articleId: { type: Type.STRING }, feedback: { type: Type.STRING } }, required: ['articleId', 'feedback'] },
    async execute({ articleId, feedback }, agent, task, state): Promise<ToolResult> {
        const article = state.articles.find((a:any) => a.id === articleId);
        if (!article) return createToolResult(state, null, {}, { error: `Article ${articleId} not found.` });
        const prompt = `Revise the following article based on this feedback: "${feedback}".\n\nArticle:\n${article.content}`;
        const response = await agent.llmService.generateResponse(prompt, agent.name);
        const newState = produce(state, draft => {
            const articleToUpdate = draft.articles.find((a:any) => a.id === articleId);
            if (articleToUpdate) articleToUpdate.content = response.text;
        });
        return createToolResult(newState, 'article_edited', { articleId }, { success: true });
    },
};

export const PublishArticleTool: Tool = {
    name: "publish_article",
    description: "Publishes an article, changing its status to 'PUBLISHED'.",
    parameters: { type: Type.OBJECT, properties: { articleId: { type: Type.STRING } }, required: ['articleId'] },
    async execute({ articleId }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            const article = draft.articles.find((a:any) => a.id === articleId);
            if (article) article.status = 'PUBLISHED';
        });
        return createToolResult(newState, 'article_published', { articleId }, { success: true });
    },
};

export const DeleteArticleTool: Tool = {
    name: "delete_article",
    description: "Deletes an article from the CMS.",
    parameters: { type: Type.OBJECT, properties: { articleId: { type: Type.STRING } }, required: ['articleId'] },
    async execute({ articleId }, agent, task, state): Promise<ToolResult> {
        const newState = produce(state, draft => {
            draft.articles = draft.articles.filter((a:any) => a.id !== articleId);
        });
        return createToolResult(newState, 'article_deleted', { articleId }, { success: true });
    },
};


// --- All available tools for the registry ---
export const allTools: Tool[] = [
    // Generic
    WebSearchTool,
    HumanInputTool,
    ConversationTool,

    // Storybook Studio
    CreateStoryOutlineTool,
    WriteChapterTool,
    CreateIllustrationsTool,
    PublishBookTool,
    ListBooksTool,
    GetBookDetailsTool,
    DeleteBookTool,

    // Agile Innovators
    PlanFeatureTool,
    WriteCodeTool,
    CreatePullRequestTool,
    RunTestsTool,
    MergePullRequestTool,
    ListFilesTool,
    ReadFileContentTool,
    
    // Ad Agency
    GetCampaignBriefTool,
    DevelopAdConceptTool,
    CreateAdCopyTool,
    DesignVisualsTool,

    // Market Insights
    CreateReportTool,
    ListReportsTool,
    GetReportDetailsTool,
    UpdateReportSectionTool,
    AnalyzeDataTool,
    SummarizeFindingsTool,

    // Blog Farm
    WriteArticleTool,
    EditArticleTool,
    PublishArticleTool,
    ListArticlesTool,
    GetArticleContentTool,
    DeleteArticleTool,
];
