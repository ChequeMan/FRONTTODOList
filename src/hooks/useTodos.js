import { useState, useEffect } from 'react';
import apiService from '../services/api';

export const useTodos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const todosData = await apiService.getTodos();
      setTodos(todosData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (text) => {
    try {
      const newTodo = await apiService.createTodo(text);
      setTodos(prev => [...prev, newTodo]);
      return newTodo;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      const updatedTodo = await apiService.updateTodo(id, updates);
      setTodos(prev => prev.map(todo => 
        todo._id === id ? updatedTodo : todo
      ));
      return updatedTodo;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTodo = async (id) => {
    try {
      await apiService.deleteTodo(id);
      setTodos(prev => prev.filter(todo => todo._id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const shareTodo = async (todoId, email) => {
    try {
      const result = await apiService.shareTodo(todoId, email);
      setTodos(prev => prev.map(todo => 
        todo._id === todoId ? result.todo : todo
      ));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const removeCollaborator = async (todoId, userId) => {
    try {
      const result = await apiService.removeCollaborator(todoId, userId);
      setTodos(prev => prev.map(todo => 
        todo._id === todoId ? result.todo : todo
      ));
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  return {
    todos,
    loading,
    error,
    loadTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    shareTodo,
    removeCollaborator,
  };
};