import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { TODO_STORAGE_KEY } from './utils/todoStorage';
import dayjs from 'dayjs';

const readPersistedTodos = () => {
  const raw = localStorage.getItem(TODO_STORAGE_KEY);
  expect(raw).toBeTruthy();
  return JSON.parse(raw);
};

describe('Todo Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('renders default seeded todos when localStorage is empty', async () => {
    render(<App />);

    // Verify default seeded tasks are rendered
    expect(screen.getByText(/Read boyd language book/i)).toBeInTheDocument();
    expect(screen.getByText(/Do My Home Work/i)).toBeInTheDocument();
    expect(screen.getByText(/create mini project react/i)).toBeInTheDocument();

    // Verify initial seeded data is also persisted
    await waitFor(() => {
      const persisted = readPersistedTodos();
      expect(persisted).toMatchObject({ version: 1 });
      expect(Array.isArray(persisted.todos)).toBe(true);
      expect(persisted.todos.length).toBeGreaterThanOrEqual(3);
    });
  });

  test('loads and renders todos from localStorage on mount', () => {
    // Set up localStorage with known test data
    const testTodos = {
      version: 1,
      savedAt: new Date().toISOString(),
      todos: [
        {
          _id: 'test-1',
          title: 'Persisted Test Task',
          status: false,
          deadline: dayjs('2024-12-31T23:59:59').toISOString()
        },
        {
          _id: 'test-2',
          title: 'Another Persisted Task',
          status: true,
          deadline: null
        }
      ]
    };

    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(testTodos));

    render(<App />);

    // Verify stored todos are rendered
    expect(screen.getByText(/Persisted Test Task/i)).toBeInTheDocument();
    expect(screen.getByText(/Another Persisted Task/i)).toBeInTheDocument();

    // Verify default seeded tasks are NOT rendered
    expect(screen.queryByText(/Read boyd language book/i)).not.toBeInTheDocument();
  });

  test('handles corrupted localStorage data gracefully by falling back to defaults', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Set invalid JSON in localStorage
    localStorage.setItem(TODO_STORAGE_KEY, 'invalid json{]');

    render(<App />);

    // Should fall back to default seeded todos
    expect(screen.getByText(/Read boyd language book/i)).toBeInTheDocument();
    expect(screen.getByText(/Do My Home Work/i)).toBeInTheDocument();

    expect(warnSpy).toHaveBeenCalled();
  });

  test('handles missing deadline fields gracefully', () => {
    const testTodos = {
      version: 1,
      savedAt: new Date().toISOString(),
      todos: [
        {
          _id: 'test-no-deadline',
          title: 'Task Without Deadline',
          status: false,
          deadline: null
        }
      ]
    };

    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(testTodos));

    render(<App />);

    expect(screen.getByText(/Task Without Deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/No deadline/i)).toBeInTheDocument();
  });

  test('persists todo ADD operation to localStorage', async () => {
    render(<App />);

    // Open Add dialog
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));

    // Enter title
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'New Persisted Todo' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));

    await waitFor(() => {
      const persisted = readPersistedTodos();
      expect(persisted).toMatchObject({ version: 1 });
      expect(persisted.todos.some((t) => t.title === 'New Persisted Todo')).toBe(true);
    });
  });

  test('persists todo TOGGLE operation to localStorage', async () => {
    render(<App />);

    // Use the seeded task which initially has status false
    expect(screen.getByText(/Read boyd language book/i)).toBeInTheDocument();

    // Find the Task container and click its first button (checkbox)
    const taskTitle = screen.getByText(/Read boyd language book/i);
    // Task root is the nearest div that contains the action buttons
    const taskContainer = taskTitle.closest('div.flex.items-center');
    expect(taskContainer).toBeTruthy();
    const rowButtons = taskContainer.querySelectorAll('button');
    expect(rowButtons.length).toBeGreaterThan(0);
    fireEvent.click(rowButtons[0]);

    await waitFor(() => {
      const persisted = readPersistedTodos();
      const target = persisted.todos.find((t) => /Read boyd language book/i.test(t.title));
      expect(target).toBeTruthy();
      expect(target.status).toBe(true);
    });
  });

  test('persists todo EDIT operation (deadline ISO) to localStorage', async () => {
    // In edit-mode, DialogTodoItem's change handlers rebuild state from `taskEdited`.
    // Multiple sequential edits (title + status + deadline) do not compose correctly
    // without changing production code (out of scope for this fix).
    // This test verifies persistence of an edited deadline in ISO format.

    const original = {
      _id: 'edit-1',
      title: 'Editable Task',
      status: true,
      deadline: dayjs('2024-01-01T09:00:00').toISOString(),
    };

    localStorage.setItem(
      TODO_STORAGE_KEY,
      JSON.stringify({ version: 1, savedAt: new Date().toISOString(), todos: [original] })
    );

    render(<App />);

    // Open edit dialog
    expect(screen.getByText(/Editable Task/i)).toBeInTheDocument();
    const taskTitle = screen.getByText(/Editable Task/i);
    const taskContainer = taskTitle.closest('div.flex.items-center');
    expect(taskContainer).toBeTruthy();
    const rowButtons = taskContainer.querySelectorAll('button');
    expect(rowButtons.length).toBeGreaterThanOrEqual(3);
    fireEvent.click(rowButtons[rowButtons.length - 1]);

    // Change ONLY deadline via DateTimePicker's onChange (handleChangeDateTask)
    const newDeadline = dayjs('2030-01-01T10:00:00');
    // MUI renders an input; setting its value is unreliable for state.
    // Instead we trigger the picker onChange by firing a change with a Dayjs value
    // through the input's onChange is not available in RTL, so we call the form submission
    // after directly setting deadline via the DateTimePicker textbox if present.

    const dateTimeInput = screen.getByRole('textbox', { name: /date&time picker/i });
    fireEvent.change(dateTimeInput, { target: { value: '01/01/2030 10:00 AM' } });

    // Submit (button text is "Edit Task")
    fireEvent.click(screen.getByRole('button', { name: /edit task/i }));

    await waitFor(() => {
      const persisted = readPersistedTodos();
      const edited = persisted.todos.find((t) => t._id === 'edit-1');
      expect(edited).toBeTruthy();
      expect(typeof edited.deadline).toBe('string');
      // ISO year should reflect the new deadline
      expect(edited.deadline).toContain('2030');
    });
  });

  test('persists todo DELETE operation to localStorage', async () => {
    render(<App />);

    expect(screen.getByText(/create mini project react/i)).toBeInTheDocument();

    const taskTitle = screen.getByText(/create mini project react/i);
    const taskContainer = taskTitle.closest('div.flex.items-center');
    expect(taskContainer).toBeTruthy();
    const rowButtons = taskContainer.querySelectorAll('button');
    expect(rowButtons.length).toBeGreaterThanOrEqual(3);

    // Delete button is typically second last button in the row
    fireEvent.click(rowButtons[rowButtons.length - 2]);

    await waitFor(() => {
      const persisted = readPersistedTodos();
      expect(persisted.todos.some((t) => /create mini project react/i.test(t.title))).toBe(false);
    });
  });
});
