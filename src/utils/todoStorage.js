import dayjs from 'dayjs';

export const TODO_STORAGE_KEY = 'simple-todo-app.todos.v1';

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const safeRead = (key) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

const safeWrite = (key, value) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
};

export const serializeTodosV1 = (todos) => {
  const safeTodos = Array.isArray(todos) ? todos : [];

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    todos: safeTodos.map((t) => {
      const deadline = t?.deadline;
      const deadlineIso = dayjs.isDayjs(deadline)
        ? (deadline.isValid() ? deadline.toISOString() : null)
        : null;

      return {
        _id: t?._id,
        title: typeof t?.title === 'string' ? t.title : '',
        status: Boolean(t?.status),
        deadline: deadlineIso,
      };
    }),
  };
};

const deserializeDeadline = (deadline) => {
  if (deadline === null || deadline === undefined) return null;
  if (typeof deadline !== 'string') return null;

  const d = dayjs(deadline);
  return d.isValid() ? d : null;
};

const isValidTodo = (t) => {
  if (!isObject(t)) return false;
  if (!('_id' in t)) return false;
  if (typeof t.title !== 'string') return false;
  if (typeof t.status !== 'boolean') return false;

  const dl = t.deadline;
  if (!(dl === null || typeof dl === 'string')) return false;

  return true;
};

export const loadTodosFromStorage = () => {
  const raw = safeRead(TODO_STORAGE_KEY);
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }

  if (!isObject(parsed)) return null;
  if (parsed.version !== 1) return null;
  if (!Array.isArray(parsed.todos)) return null;

  const restored = [];
  for (const t of parsed.todos) {
    if (!isValidTodo(t)) return null;

    restored.push({
      _id: t._id,
      title: t.title,
      status: t.status,
      deadline: deserializeDeadline(t.deadline),
    });
  }

  return restored;
};

export const saveTodosToStorage = (todos) => {
  const payload = serializeTodosV1(todos);
  const json = JSON.stringify(payload);
  return safeWrite(TODO_STORAGE_KEY, json);
};