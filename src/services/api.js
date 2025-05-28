const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class apiService {
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

  // Métodos de autenticación
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

  // Métodos de todos
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

  // Método para buscar usuarios
  async searchUsers(query) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }
}
const ApiService = new apiService();
export default ApiService;