import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidConfig =
	typeof supabaseUrl === "string" &&
	supabaseUrl.startsWith("http") &&
	typeof supabaseKey === "string" &&
	supabaseKey.length > 20 &&
	!supabaseUrl.includes("your_url") &&
	!supabaseKey.includes("your_anon_key");

// Keep app usable even before real keys are configured.
const noopError = { data: null, error: { message: "Supabase is not configured" } };
const noopCount = { count: 0, error: { message: "Supabase is not configured" } };

const unconfiguredClient = {
	from() {
		return {
			select(_cols, opts) {
				if (opts?.head) return Promise.resolve(noopCount);
				return Promise.resolve(noopError);
			},
			insert() {
				return {
					select() {
						return { single: async () => noopError };
					},
				};
			},
			update() {
				return {
					eq() {
						return {
							select() {
								return { single: async () => noopError };
							},
							then(resolve) {
								return Promise.resolve(noopError).then(resolve);
							},
						};
					},
				};
			},
			eq() {
				return {
					eq() {
						return {
							maybeSingle: async () => noopError,
							single: async () => noopError,
							select() {
								return { single: async () => noopError };
							},
						};
					},
					maybeSingle: async () => noopError,
					single: async () => noopError,
					order() {
						return Promise.resolve({ data: [], error: null });
					},
					limit() {
						return Promise.resolve({ data: [], error: null });
					},
				};
			},
			order() {
				return Promise.resolve({ data: [], error: null });
			},
		};
	},
	channel() {
		return {
			on() {
				return this;
			},
			subscribe() {
				return {};
			},
		};
	},
	removeChannel() {},
};

if (!hasValidConfig) {
	// eslint-disable-next-line no-console
	console.warn("Supabase env vars are missing or placeholders. Update frontend/.env");
}

export const supabase = hasValidConfig ? createClient(supabaseUrl, supabaseKey) : unconfiguredClient;
