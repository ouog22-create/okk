import { apiPath } from '../shared/paths.js';

export function createCollection(resource) {
    const state = { items: [], loading: true, error: false };
    return {
        state,
        async load() {
            try {
                const response = await fetch(apiPath(resource));
                if (!response.ok) throw new Error();
                state.items = (await response.json())[resource];
            } catch { state.error = true; }
            finally { state.loading = false; }
        },
    };
}
