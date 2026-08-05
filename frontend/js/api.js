const API_BASE = "/api";

async function api(path, options = {}) {
  const { method = "GET", body } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body != null ? { "Content-Type": "application/json" } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    let errorMessage = "Request failed";
    try {
      errorMessage = JSON.parse(errorBody).error || errorMessage;
    } catch (e) {
      if (errorBody) errorMessage = errorBody;
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

api.get = (path) => api(path);
api.post = (path, body) => api(path, { method: "POST", body });
api.put = (path, body) => api(path, { method: "PUT", body });

window.api = api;

async function apiGet(path) {
  return api.get(path);
}

async function apiPost(path, body) {
  return api.post(path, body);
}

async function apiPut(path, body) {
  return api.put(path, body);
}
