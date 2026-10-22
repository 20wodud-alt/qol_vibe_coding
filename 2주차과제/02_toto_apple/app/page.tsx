"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CirclePlus,
  Inbox,
  ListTodo,
  MoreHorizontal,
  Search,
  Sparkles,
  Star,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Filter = "today" | "upcoming" | "all" | "completed";
type Priority = "none" | "important";
type Todo = {
  id: string;
  title: string;
  note: string;
  due: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
};

type TodoRow = {
  id: string;
  text: string;
  note: string;
  due: string;
  completed: boolean;
  priority: Priority;
  created_at: string;
};

function fromRow(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.text,
    note: row.note,
    due: row.due,
    completed: row.completed,
    priority: row.priority,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function isoDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const starterTasks = (): Todo[] => [
  { id: "welcome", title: "Toto에 오신 것을 환영해요", note: "할 일을 선택하면 메모와 날짜를 편집할 수 있어요.", due: isoDate(), completed: false, priority: "important", createdAt: Date.now() },
  { id: "focus", title: "오늘의 가장 중요한 일 정하기", note: "한 번에 하나씩, 가볍게 시작해 보세요.", due: isoDate(), completed: false, priority: "none", createdAt: Date.now() - 1 },
  { id: "tomorrow", title: "내일 할 일 미리 적어두기", note: "", due: isoDate(1), completed: false, priority: "none", createdAt: Date.now() - 2 },
];

function friendlyDate(date: string) {
  if (date === isoDate()) return "오늘";
  if (date === isoDate(1)) return "내일";
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(parsed);
}

const navItems: { key: Filter; label: string; icon: typeof Sun; color: string }[] = [
  { key: "today", label: "오늘", icon: Sun, color: "#ff9f0a" },
  { key: "upcoming", label: "예정", icon: CalendarDays, color: "#5e5ce6" },
  { key: "all", label: "전체", icon: Inbox, color: "#007aff" },
  { key: "completed", label: "완료됨", icon: CheckCircle2, color: "#34c759" },
];

export default function Home() {
  const [tasks, setTasks] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>("today");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [quickTitle, setQuickTitle] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const [syncError, setSyncError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDateLabel(new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date()));
    async function loadTasks() {
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData.session?.user;

      if (!user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          setSyncError("Supabase에 연결하지 못했어요.");
          setHydrated(true);
          return;
        }
        user = data.user ?? undefined;
      }

      const { data, error } = await supabase
        .from("apple_todos")
        .select("id, text, note, due, completed, priority, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setSyncError("할 일을 불러오지 못했어요.");
      } else if (data && data.length > 0) {
        setTasks((data as TodoRow[]).map(fromRow));
      } else if (user) {
        const seeds = starterTasks().map((task) => ({
          user_id: user.id,
          text: task.title,
          note: task.note,
          due: task.due,
          completed: task.completed,
          priority: task.priority,
        }));
        const { data: inserted, error: insertError } = await supabase
          .from("apple_todos")
          .insert(seeds)
          .select("id, text, note, due, completed, priority, created_at");
        if (insertError) setSyncError("시작할 일을 저장하지 못했어요.");
        else setTasks(((inserted ?? []) as TodoRow[]).map(fromRow));
      }
      setHydrated(true);
    }

    void loadTasks();
  }, []);

  const selected = tasks.find((task) => task.id === selectedId) ?? null;
  const todayCount = tasks.filter((task) => !task.completed && task.due === isoDate()).length;
  const upcomingCount = tasks.filter((task) => !task.completed && task.due > isoDate()).length;

  const visibleTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      if (filter === "today") return !task.completed && task.due <= isoDate();
      if (filter === "upcoming") return !task.completed && task.due > isoDate();
      if (filter === "completed") return task.completed;
      return !task.completed;
    });
    if (query.trim()) result = result.filter((task) => `${task.title} ${task.note}`.toLowerCase().includes(query.toLowerCase()));
    return result.sort((a, b) => Number(b.priority === "important") - Number(a.priority === "important") || a.due.localeCompare(b.due) || b.createdAt - a.createdAt);
  }, [tasks, filter, query]);

  const completionRate = tasks.length ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100) : 0;

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data, error } = await supabase
      .from("apple_todos")
      .insert({
      user_id: authData.user.id,
      text: title,
      note: "",
      due: filter === "upcoming" ? isoDate(1) : isoDate(),
      completed: false,
      priority: "none",
      })
      .select("id, text, note, due, completed, priority, created_at")
      .single();
    if (error || !data) {
      setSyncError("할 일을 추가하지 못했어요.");
      return;
    }
    const task = fromRow(data as TodoRow);
    setTasks((current) => [task, ...current]);
    setQuickTitle("");
    setSelectedId(task.id);
    setSyncError("");
  }

  async function patchTask(id: string, patch: Partial<Todo>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
    const databasePatch: Record<string, string | boolean> = {};
    if (patch.title !== undefined) databasePatch.text = patch.title;
    if (patch.note !== undefined) databasePatch.note = patch.note;
    if (patch.due !== undefined) databasePatch.due = patch.due;
    if (patch.completed !== undefined) databasePatch.completed = patch.completed;
    if (patch.priority !== undefined) databasePatch.priority = patch.priority;
    const { error } = await supabase.from("apple_todos").update(databasePatch).eq("id", id);
    if (error) setSyncError("변경사항을 저장하지 못했어요.");
    else setSyncError("");
  }

  function patchTaskLocally(id: string, patch: Partial<Todo>) {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  async function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSelectedId(null);
    setDetailOpen(false);
    const { error } = await supabase.from("apple_todos").delete().eq("id", id);
    if (error) setSyncError("할 일을 삭제하지 못했어요.");
  }

  async function clearCompleted() {
    const completedIds = tasks.filter((task) => task.completed).map((task) => task.id);
    if (completedIds.length === 0) return;
    const { error } = await supabase.from("apple_todos").delete().in("id", completedIds);
    if (error) {
      setSyncError("완료한 항목을 지우지 못했어요.");
      return;
    }
    setTasks((current) => current.filter((task) => !task.completed));
    setSelectedId(null);
    setSyncError("");
  }

  function chooseTask(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  const activeMeta = navItems.find((item) => item.key === filter)!;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Check size={18} strokeWidth={3} /></span><span>Toto</span></div>
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="검색" aria-label="할 일 검색" />
          {query && <button onClick={() => setQuery("")} aria-label="검색어 지우기"><X size={14} /></button>}
        </label>
        <nav className="nav-list" aria-label="할 일 목록">
          {navItems.map(({ key, label, icon: Icon, color }) => {
            const count = key === "today" ? todayCount : key === "upcoming" ? upcomingCount : key === "all" ? tasks.filter((t) => !t.completed).length : tasks.filter((t) => t.completed).length;
            return (
              <button className={filter === key ? "active" : ""} key={key} onClick={() => { setFilter(key); setDetailOpen(false); }}>
                <span className="nav-icon" style={{ background: color }}><Icon size={16} /></span>
                <span>{label}</span><span className="nav-count">{count}</span><ChevronRight className="chevron" size={14} />
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="progress-head"><span>이번 주의 흐름</span><strong>{completionRate}%</strong></div>
          <div className="progress-track"><span style={{ width: `${completionRate}%` }} /></div>
          <p>작은 완료가 좋은 하루를 만들어요.</p>
        </div>
      </aside>

      <section className="content">
        <header className="content-header">
          <div>
            <p className="eyebrow">{dateLabel || "오늘의 할 일"}</p>
            <h1>{activeMeta.label}</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button" aria-label="검색" onClick={() => (document.querySelector(".search-box input") as HTMLInputElement)?.focus()}><Search size={19} /></button>
            <button className="avatar" aria-label="프로필">T</button>
          </div>
        </header>

        <div className="summary-card">
          <div className="summary-copy">
            <span className="summary-icon"><Sparkles size={18} /></span>
            <div><strong>{todayCount ? `오늘 ${todayCount}개의 할 일이 있어요` : "오늘 할 일을 모두 마쳤어요"}</strong><p>{todayCount ? "가장 중요한 일부터 시작해 볼까요?" : "느긋하게 다음 하루를 준비해 보세요."}</p></div>
          </div>
          <span className="summary-date">{completionRate}% 완료</span>
        </div>

        <form className="quick-add" onSubmit={addTask}>
          <CirclePlus size={21} />
          <input ref={inputRef} value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="새로운 할 일" aria-label="새로운 할 일" />
          <button type="submit" disabled={!quickTitle.trim()}>추가</button>
        </form>

        {syncError && <p className="sync-error">{syncError}</p>}

        <div className="list-head"><span>{visibleTasks.length}개의 할 일</span>{filter === "completed" && visibleTasks.length > 0 && <button onClick={() => void clearCompleted()}>완료 항목 지우기</button>}</div>

        <div className="task-list">
          {!hydrated ? <div className="empty-state"><div className="loader" /><p>할 일을 불러오고 있어요</p></div> : visibleTasks.length === 0 ? (
            <div className="empty-state"><span><Check size={28} /></span><h2>{query ? "검색 결과가 없어요" : filter === "completed" ? "완료한 일이 아직 없어요" : "모두 해냈어요"}</h2><p>{query ? "다른 검색어로 찾아보세요." : "새로운 할 일을 추가하거나 잠시 쉬어가세요."}</p></div>
          ) : visibleTasks.map((task) => (
            <article className={`task-row ${task.completed ? "done" : ""} ${selectedId === task.id ? "selected" : ""}`} key={task.id} onClick={() => chooseTask(task.id)}>
              <button className="check-button" aria-label={task.completed ? "완료 취소" : "완료하기"} onClick={(event) => { event.stopPropagation(); patchTask(task.id, { completed: !task.completed }); }}>
                {task.completed ? <span className="checked"><Check size={15} strokeWidth={3} /></span> : <Circle size={22} />}
              </button>
              <div className="task-copy"><strong>{task.title}</strong><div className="task-meta"><span className={task.due < isoDate() && !task.completed ? "overdue" : ""}><CalendarDays size={13} />{task.due < isoDate() && !task.completed ? "기한 지남 · " : ""}{friendlyDate(task.due)}</span>{task.note && <span>메모</span>}</div></div>
              {task.priority === "important" && <Star className="priority-star" size={18} fill="currentColor" />}
              <ChevronRight className="row-chevron" size={17} />
            </article>
          ))}
        </div>
      </section>

      <aside className={`detail-panel ${detailOpen ? "open" : ""}`}>
        {selected ? (
          <>
            <div className="detail-toolbar"><button className="mobile-close" onClick={() => setDetailOpen(false)}><X size={20} /></button><span>세부사항</span><button aria-label="더 보기"><MoreHorizontal size={20} /></button></div>
            <div className="detail-body">
              <div className="detail-title-row">
                <button className="check-button" onClick={() => patchTask(selected.id, { completed: !selected.completed })}>{selected.completed ? <span className="checked"><Check size={15} strokeWidth={3} /></span> : <Circle size={23} />}</button>
                <textarea className={selected.completed ? "title-completed" : ""} value={selected.title} onChange={(event) => patchTaskLocally(selected.id, { title: event.target.value })} onBlur={(event) => void patchTask(selected.id, { title: event.target.value })} rows={2} aria-label="할 일 제목" />
              </div>
              <div className="detail-group">
                <label><span><CalendarDays size={18} /> 날짜</span><input type="date" value={selected.due} onChange={(event) => patchTask(selected.id, { due: event.target.value })} /></label>
                <button className="detail-option" onClick={() => patchTask(selected.id, { priority: selected.priority === "important" ? "none" : "important" })}><span><Star size={18} /> 중요</span><span className={`switch ${selected.priority === "important" ? "on" : ""}`}><i /></span></button>
              </div>
              <label className="notes"><span>메모</span><textarea value={selected.note} onChange={(event) => patchTaskLocally(selected.id, { note: event.target.value })} onBlur={(event) => void patchTask(selected.id, { note: event.target.value })} placeholder="생각이나 세부 내용을 적어보세요…" rows={7} /></label>
            </div>
            <button className="delete-button" onClick={() => removeTask(selected.id)}><Trash2 size={17} /> 할 일 삭제</button>
          </>
        ) : (
          <div className="detail-empty"><span><ListTodo size={28} /></span><h2>할 일을 선택하세요</h2><p>날짜, 중요도와 메모를<br />여기에서 정리할 수 있어요.</p></div>
        )}
      </aside>

      {detailOpen && <button className="backdrop" aria-label="세부사항 닫기" onClick={() => setDetailOpen(false)} />}

      <nav className="mobile-nav" aria-label="모바일 할 일 목록">
        {navItems.map(({ key, label, icon: Icon }) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}><Icon size={21} /><span>{label}</span></button>)}
      </nav>
    </main>
  );
}
