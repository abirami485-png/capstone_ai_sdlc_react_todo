import { render, screen } from '@testing-library/react';
import App from './App';
import { TODO_STORAGE_KEY } from './utils/todoStorage';
import dayjs from 'dayjs';

describe('Todo Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  test('renders default seeded todos when localStorage is empty', () => {
    render(<App />);

    // Verify default seeded tasks are rendered
    expect(screen.getByText(/Read boyd language book/i)).toBeInTheDocument();
    expect(screen.getByText(/Do My Home Work/i)).toBeInTheDocument();
    expect(screen.getByText(/create mini project react/i)).toBeInTheDocument();
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
    // Set invalid JSON in localStorage
    localStorage.setItem(TODO_STORAGE_KEY, 'invalid json{]');

    render(<App />);

    // Should fall back to default seeded todos
    expect(screen.getByText(/Read boyd language book/i)).toBeInTheDocument();
    expect(screen.getByText(/Do My Home Work/i)).toBeInTheDocument();
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
});
