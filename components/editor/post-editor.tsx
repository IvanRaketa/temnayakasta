"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import NextLink from "next/link";
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";
import {
  Bold,
  CheckCircle2,
  Code,
  ExternalLink,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Save,
  Send,
  Smile,
  Strikethrough,
  Tag,
  X,
} from "lucide-react";
import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import {
  savePostAction,
  uploadPostImageAction,
  type PostEditorActionResult,
} from "@/app/(main)/create/actions";
import { Button } from "@/components/ui/button";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";
import { MAX_TAG_LENGTH, MAX_TAGS_PER_POST, normalizeTags } from "@/lib/tags/normalize";
import { cn } from "@/lib/utils";

const TITLE_LIMIT = 160;
const BODY_LIMIT = 50_000;
const LOCAL_DRAFT_KEY = "temnaya-kasta:create-post-draft";

export interface PostEditorInitialPost {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "PUBLISHED" | "PENDING_REVIEW" | "HIDDEN" | "BLOCKED";
  slug: string;
  tags?: string[];
}

interface LocalDraft {
  postId?: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

interface EditorToast {
  type: "success" | "error";
  message: string;
  slug?: string;
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-md border border-border bg-background/35 text-muted-foreground transition hover:border-accent/45 hover:bg-secondary/70 hover:text-foreground",
        active &&
          "border-primary/60 bg-primary/15 text-primary shadow-[0_0_16px_rgba(246,205,96,0.12)]",
      )}
    >
      {children}
    </button>
  );
}

function getDirectHttpsImageUrl(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== "https:") return null;
    if (!/\.(?:png|jpe?g|webp|gif)$/iu.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function PublishingSkeleton() {
  return (
    <section className="tk-glass rounded-lg p-4 md:p-5" aria-live="polite">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="size-2 rounded-full bg-primary" />
        Публикация появляется в ленте
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-full animate-pulse rounded bg-secondary" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-secondary" />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-16 animate-pulse rounded-md bg-secondary" />
          <div className="h-16 animate-pulse rounded-md bg-secondary" />
          <div className="h-16 animate-pulse rounded-md bg-secondary" />
        </div>
      </div>
    </section>
  );
}

function EditorToastMessage({ toast, onClose }: { toast: EditorToast; onClose: () => void }) {
  return (
    <div className="tk-glass-strong fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-xl rounded-lg p-3 shadow-xl md:bottom-6">
      <div className="flex gap-3">
        <CheckCircle2
          className={cn(
            "mt-0.5 size-5 shrink-0",
            toast.type === "success" ? "text-primary" : "text-destructive",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{toast.message}</p>
          {toast.slug ? (
            <Button asChild size="sm" className="mt-3 w-full sm:w-auto">
              <NextLink href={`/post/${toast.slug}`}>
                <ExternalLink className="size-4" />
                Открыть пост
              </NextLink>
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Закрыть уведомление"
          onClick={onClose}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function PostEditor({ initialPost }: { initialPost?: PostEditorInitialPost }) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submissionRef = useRef(false);
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialPost?.tags ?? []);
  const [postId, setPostId] = useState<string | undefined>(initialPost?.id);
  const [mode, setMode] = useState<"editor" | "preview">("editor");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [status, setStatus] = useState(
    initialPost ? "Публикация загружена для редактирования" : "Черновик готов к работе",
  );
  const [dirty, setDirty] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<"idle" | "draft" | "publish">("idle");
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [toast, setToast] = useState<EditorToast | null>(null);
  const [isPending, startTransition] = useTransition();
  const localDraftKey = useMemo(
    () => `${LOCAL_DRAFT_KEY}:${initialPost?.id ?? "new"}`,
    [initialPost?.id],
  );

  const editor = useEditor({
    immediatelyRender: false,
    content: initialPost?.content ?? "",
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "post-image",
        },
      }),
      Placeholder.configure({
        placeholder: "Начните писать публикацию...",
      }),
      CharacterCount.configure({
        limit: BODY_LIMIT,
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[420px] w-full max-w-none px-5 py-5 text-base leading-7 text-foreground focus:outline-none",
      },
    },
    onUpdate: () => {
      setDirty(true);
    },
  });

  const content = editor?.getHTML() ?? "";
  const bodyCount = editor?.storage.characterCount.characters() ?? 0;
  const titleCount = title.length;
  const isSubmitting = isPending || submissionMode !== "idle";

  const updateTitleHeight = useCallback(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  const persistLocalDraft = useCallback(() => {
    const draft: LocalDraft = {
      postId,
      title,
      content: editor?.getHTML() ?? "",
      tags,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(localDraftKey, JSON.stringify(draft));
    setStatus("Черновик сохранён в браузере");
  }, [editor, localDraftKey, postId, tags, title]);

  const applySaveResult = useCallback((result: PostEditorActionResult) => {
    setStatus(result.message);
    if (result.postId) {
      setPostId(result.postId);
    }
    if (result.ok) {
      setDirty(false);
    }
  }, []);

  const saveToServer = useCallback(
    (nextStatus: "DRAFT" | "PUBLISHED") => {
      if (!editor || submissionRef.current) return;

      persistLocalDraft();
      submissionRef.current = true;
      setSubmissionMode(nextStatus === "PUBLISHED" ? "publish" : "draft");
      setStatus(nextStatus === "PUBLISHED" ? "Публикую..." : "Сохраняю...");
      setToast(null);

      startTransition(async () => {
        try {
          const result = await savePostAction({
            postId,
            title,
            content: editor.getHTML(),
            status: nextStatus,
            tags,
          });
          applySaveResult(result);

          if (!result.ok) {
            setToast({ type: "error", message: result.message });
            return;
          }

          if (nextStatus === "PUBLISHED" && result.slug) {
            window.localStorage.removeItem(localDraftKey);
            setPublishedSlug(result.slug);
            setStatus("Публикация опубликована");
            setToast({
              type: "success",
              message: "Пост опубликован и появился в ленте.",
              slug: result.slug,
            });
            return;
          }

          setToast({ type: "success", message: result.message });
        } catch (error) {
          console.error(error);
          setStatus("Не удалось завершить публикацию");
          setToast({
            type: "error",
            message: "Не удалось сохранить пост. Локальный черновик остался в браузере.",
          });
        } finally {
          submissionRef.current = false;
          setSubmissionMode("idle");
        }
      });
    },
    [applySaveResult, editor, localDraftKey, persistLocalDraft, postId, tags, title],
  );

  const addTag = useCallback(() => {
    const normalized = normalizeTags([...tags, tagInput]);
    setTags(normalized.map((tag) => tag.name));
    setTagInput("");
    setDirty(true);
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((currentTags) => currentTags.filter((item) => item !== tag));
    setDirty(true);
  }, []);

  const insertImageUrl = useCallback(() => {
    if (!editor) return;

    const value = window.prompt("Вставьте прямую HTTPS-ссылку на изображение");
    if (value === null) return;

    const imageUrl = getDirectHttpsImageUrl(value);
    if (!imageUrl) {
      const message = "Укажите прямую HTTPS-ссылку на изображение PNG, JPG, WebP или GIF.";
      setStatus(message);
      setToast({ type: "error", message });
      return;
    }

    editor.chain().focus().setImage({ src: imageUrl, alt: "Изображение" }).run();
    setStatus("Изображение вставлено по ссылке");
    setDirty(true);
  }, [editor]);

  const insertImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      const formData = new FormData();
      formData.set("file", file);
      setStatus("Загружаю изображение...");
      const result = await uploadPostImageAction(formData);

      if (!result.ok || !result.imageUrl) {
        setStatus(result.message);
        setToast({ type: "error", message: result.message });
        return;
      }

      editor.chain().focus().setImage({ src: result.imageUrl, alt: file.name }).run();
      setStatus(result.message);
      setDirty(true);
    },
    [editor],
  );

  const onFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        await insertImageFile(file);
      }
      event.target.value = "";
    },
    [insertImageFile],
  );

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      const file = Array.from(event.dataTransfer.files).find((item) =>
        item.type.startsWith("image/"),
      );

      if (!file) return;
      event.preventDefault();
      await insertImageFile(file);
    },
    [insertImageFile],
  );

  const onEmojiClick = useCallback(
    (emoji: EmojiClickData) => {
      editor?.chain().focus().insertContent(emoji.emoji).run();
      setEmojiOpen(false);
      setDirty(true);
    },
    [editor],
  );

  useEffect(() => {
    if (!editor) return;

    const rawDraft = window.localStorage.getItem(localDraftKey);

    if (!rawDraft) {
      if (initialPost) {
        editor.commands.setContent(initialPost.content || "");
        window.queueMicrotask(() => {
          setTitle(initialPost.title);
          setTags(initialPost.tags ?? []);
          setPostId(initialPost.id);
          setStatus("Публикация загружена для редактирования");
          updateTitleHeight();
        });
      }

      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as LocalDraft;
      editor.commands.setContent(draft.content || "");
      window.queueMicrotask(() => {
        setTitle(draft.title ?? "");
        setTags(normalizeTags(draft.tags ?? []).map((tag) => tag.name));
        setPostId(draft.postId);
        setStatus("Черновик восстановлен");
        updateTitleHeight();
      });
    } catch {
      window.localStorage.removeItem(localDraftKey);
    }
  }, [editor, initialPost, localDraftKey, updateTitleHeight]);

  useEffect(() => {
    updateTitleHeight();
  }, [title, updateTitleHeight]);

  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(persistLocalDraft, 600);
    return () => window.clearTimeout(timeout);
  }, [dirty, persistLocalDraft]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const toolbar = useMemo(() => {
    if (!editor) return null;

    return (
      <div className="flex flex-wrap gap-2">
        <ToolbarButton
          label="Обычный текст"
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Заголовок 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Заголовок 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Жирный"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Курсив"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Зачёркнутый"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Список"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Нумерованный список"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Цитата"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Код"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Разделитель"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Изображение по URL" onClick={insertImageUrl}>
          <ImagePlus className="size-4" />
        </ToolbarButton>
        <div className="relative">
          <ToolbarButton
            label="Эмодзи"
            active={emojiOpen}
            onClick={() => setEmojiOpen((value) => !value)}
          >
            <Smile className="size-4" />
          </ToolbarButton>
          {emojiOpen ? (
            <div className="tk-glass-strong absolute left-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] animate-in rounded-lg p-2 shadow-xl">
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={Theme.DARK}
                emojiStyle={EmojiStyle.NATIVE}
                width="100%"
                height={360}
                searchPlaceholder="Поиск"
                previewConfig={{ showPreview: false }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }, [editor, emojiOpen, insertImageUrl, onEmojiClick]);

  return (
    <div className="space-y-5" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileInput}
      />

      <section className="tk-glass-strong tk-panel rounded-lg p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <textarea
              ref={titleRef}
              value={title}
              maxLength={TITLE_LIMIT}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
              placeholder="Заголовок публикации"
              className="min-h-14 w-full resize-none overflow-hidden bg-transparent text-3xl font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground md:text-4xl"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span>
                {titleCount}/{TITLE_LIMIT}
              </span>
              <span>
                {bodyCount}/{BODY_LIMIT}
              </span>
              <span>{status}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "editor" ? "default" : "secondary"}
              onClick={() => {
                setEmojiOpen(false);
                setMode("editor");
              }}
            >
              Редактор
            </Button>
            <Button
              variant={mode === "preview" ? "default" : "secondary"}
              onClick={() => {
                setEmojiOpen(false);
                setMode("preview");
              }}
            >
              Предпросмотр
            </Button>
          </div>
        </div>
      </section>

      <section className="tk-glass overflow-hidden rounded-lg">
        <div className="border-b border-border p-3 md:p-4">{toolbar}</div>
        {mode === "editor" ? (
          <EditorContent editor={editor} />
        ) : (
          <article
            className="prose-tk min-h-[420px] px-5 py-5"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </section>

      {submissionMode === "publish" ? <PublishingSkeleton /> : null}

      {publishedSlug ? (
        <section className="tk-glass rounded-lg border-primary/40 bg-primary/10 p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                Пост опубликован
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Публикация готова и доступна в ленте.
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <NextLink href={`/post/${publishedSlug}`}>
                <ExternalLink className="size-4" />
                Открыть пост
              </NextLink>
            </Button>
          </div>
        </section>
      ) : null}

      <section className="tk-glass rounded-lg p-4 md:p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Tag className="size-4 text-primary" />
            Теги
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <input
              value={tagInput}
              maxLength={MAX_TAG_LENGTH}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Например: проза, дневник, код"
              className="h-10 w-full min-w-0 rounded-md border border-input bg-background/70 px-3 text-sm text-foreground outline-none backdrop-blur transition focus-visible:ring-2 focus-visible:ring-ring sm:flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={addTag}
              disabled={tags.length >= MAX_TAGS_PER_POST}
            >
              Добавить
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            До {MAX_TAGS_PER_POST} тегов, до {MAX_TAG_LENGTH} символов каждый. Регистр не создаёт
            дубли.
          </p>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="tk-pill max-w-full text-foreground">
                  <span className="max-w-48 truncate">#{tag}</span>
                  <button
                    type="button"
                    aria-label={`Удалить тег ${tag}`}
                    onClick={() => removeTag(tag)}
                    className="grid size-5 place-items-center rounded hover:bg-secondary"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="tk-glass-strong flex flex-col gap-3 rounded-lg p-3 md:sticky md:bottom-4 md:z-20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {submissionMode === "publish"
              ? "Публикую..."
              : submissionMode === "draft"
                ? "Сохраняю..."
                : status}
          </p>
          <p className="text-xs leading-5">
            Публикуя пост, изображения и теги, вы соглашаетесь с их доступностью другим
            пользователям и посетителям сайта. {" "}
            <NextLink
              href={LEGAL_DOCUMENTS.personalDataDistributionConsent.href}
              className="text-primary hover:underline"
            >
              Подробнее
            </NextLink>
            .
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => saveToServer("DRAFT")} disabled={isSubmitting}>
            <Save className="size-4" />
            {submissionMode === "draft" ? "Сохраняю..." : "Сохранить"}
          </Button>
          <Button onClick={() => saveToServer("PUBLISHED")} disabled={isSubmitting}>
            <Send className="size-4" />
            {submissionMode === "publish" ? "Публикую..." : "Опубликовать"}
          </Button>
          {publishedSlug ? (
            <Button asChild variant="secondary">
              <NextLink href={`/post/${publishedSlug}`}>
                <ExternalLink className="size-4" />
                Открыть пост
              </NextLink>
            </Button>
          ) : null}
        </div>
      </div>
      {toast ? <EditorToastMessage toast={toast} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
