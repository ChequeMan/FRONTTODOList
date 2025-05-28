import React, { useState, useEffect, createContext, useContext } from 'react';
import { Plus, Trash2, Edit3, Share2, Check, X, User, Mail, Search, LogOut, Users } from 'lucide-react';
import './index.css';
// API Service
const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(data.token);
    return data;
  }

  async register(name, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    
    this.setToken(data.token);
    return data;
  }

  async getProfile() {
    return this.request('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  async getTodos() {
    return this.request('/todos');
  }

  async createTodo(text) {
    return this.request('/todos', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async updateTodo(id, updates) {
    return this.request(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTodo(id) {
    return this.request(`/todos/${id}`, {
      method: 'DELETE',
    });
  }

  async shareTodo(todoId, email) {
    return this.request(`/todos/${todoId}/share`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async removeCollaborator(todoId, userId) {
    return this.request(`/todos/${todoId}/collaborators/${userId}`, {
      method: 'DELETE',
    });
  }

  async searchUsers(query) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }
}

const apiService = new ApiService();

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiService.setToken(token);
      apiService.getProfile()
        .then(userData => {
          setUser(userData);
        })
        .catch(error => {
          console.error('Error al verificar token:', error);
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await apiService.login(email, password);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await apiService.register(name, email, password);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    apiService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Todos Hook
const useTodos = () => {
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

// Components
const LoginForm = ({ onToggle }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Iniciar Sesión</h1>
          <p className="text-gray-600 mt-2">Accede a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onToggle}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const RegisterForm = ({ onToggle }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-600 mt-2">Únete para gestionar tus tareas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={onToggle}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Inicia sesión aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({ todo, onClose, onShare }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await apiService.searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    searchUsers(value);
  };

  const handleShare = async (shareEmail) => {
    setLoading(true);
    setError('');

    try {
      await onShare(todo._id, shareEmail);
      setEmail('');
      setSearchResults([]);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await apiService.removeCollaborator(todo._id, userId);
      // Recargar la página o actualizar el estado local
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Compartir Tarea</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Tarea: "{todo.text}"</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar usuario por email o nombre
          </label>
          <div className="relative">
            <input
              type="text"
              value={email}
              onChange={handleEmailChange}
              placeholder="Escribe email o nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={16} />
          </div>

          {searching && (
            <p className="text-sm text-gray-500 mt-2">Buscando...</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-md max-h-32 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user._id}
                  onClick={() => handleShare(user.email)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <User size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => handleShare(email)}
          disabled={loading || !email}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 mb-4"
        >
          {loading ? 'Compartiendo...' : 'Compartir'}
        </button>

        {todo.collaborators && todo.collaborators.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Colaboradores actuales:</h4>
            <div className="space-y-2">
              {todo.collaborators.map(collaborator => (
                <div key={collaborator._id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{collaborator.name}</p>
                      <p className="text-xs text-gray-500">{collaborator.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TodoItem = ({ todo, onUpdate, onDelete, onShare, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleToggleComplete = () => {
    onUpdate(todo._id, { completed: !todo.completed });
  };

  const handleSaveEdit = () => {
    if (editText.trim() !== todo.text) {
      onUpdate(todo._id, { text: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(todo.text);
    setIsEditing(false);
  };

  const isOwner = todo.owner._id === currentUser.id;
  const isCollaborator = todo.collaborators && todo.collaborators.some(c => c._id === currentUser.id);

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border p-4 transition-all hover:shadow-md ${
        todo.completed ? 'opacity-75' : ''
      }`}>
        <div className="flex items-start space-x-3">
          <button
            onClick={handleToggleComplete}
            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              todo.completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {todo.completed && <Check size={12} />}
          </button>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className={`text-gray-900 ${todo.completed ? 'line-through' : ''}`}>
                  {todo.text}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <span>Por: {todo.owner.name}</span>
                    {todo.collaborators && todo.collaborators.length > 0 && (
                      <span className="ml-2 inline-flex items-center">
                        <Users size={12} className="mr-1" />
                        {todo.collaborators.length} colaborador{todo.collaborators.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              title="Editar"
            >
              <Edit3 size={16} />
            </button>

            {isOwner && (
              <button
                onClick={() => setShowShareModal(true)}
                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                title="Compartir"
              >
                <Share2 size={16} />
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => onDelete(todo._id)}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showShareModal && (
        <ShareModal
          todo={todo}
          onClose={() => setShowShareModal(false)}
          onShare={onShare}
        />
      )}
    </>
  );
};

const TodoApp = () => {
  const { user, logout } = useAuth();
  const { todos, loading, error, addTodo, updateTodo, deleteTodo, shareTodo } = useTodos();
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, completed

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      try {
        await addTodo(newTodoText.trim());
        setNewTodoText('');
      } catch (err) {
        console.error('Error adding todo:', err);
      }
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
              <p className="text-gray-600 mt-1">¡Hola, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {completedCount} de {totalCount} completadas
                </p>
                <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <LogOut size={16} />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Todo Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleAddTodo} className="flex space-x-4">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="¿Qué necesitas hacer hoy?"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Agregar</span>
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pendientes ({totalCount - completedCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Completadas ({completedCount})
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="text-gray-600 mt-2">Cargando tareas...</p>
          </div>
        ) : (
          /* Todo List */
          <div className="space-y-4">
            {filteredTodos.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Plus size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'completed' 
                    ? 'No tienes tareas completadas' 
                    : filter === 'active' 
                    ? 'No tienes tareas pendientes' 
                    : 'No tienes tareas aún'
                  }
                </h3>
                <p className="text-gray-600">
                  {filter === 'all' 
                    ? 'Agrega tu primera tarea usando el formulario de arriba.' 
                    : 'Cambia el filtro para ver otras tareas.'
                  }
                </p>
              </div>
            ) : (
              filteredTodos.map(todo => (
                <TodoItem
                  key={todo._id}
                  todo={todo}
                  onUpdate={updateTodo}
                  onDelete={deleteTodo}
                  onShare={shareTodo}
                  currentUser={user}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <LoginForm onToggle={() => setIsLogin(false)} />
  ) : (
    <RegisterForm onToggle={() => setIsLogin(true)} />
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return user ? <TodoApp /> : <AuthScreen />;
};

export default App