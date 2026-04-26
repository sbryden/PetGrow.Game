export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.fNWFfXhH.js",app:"_app/immutable/entry/app.CyTY5FfO.js",imports:["_app/immutable/entry/start.fNWFfXhH.js","_app/immutable/chunks/B4qkNomF.js","_app/immutable/chunks/JE11dUaq.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/entry/app.CyTY5FfO.js","_app/immutable/chunks/JE11dUaq.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/CVFJ_boD.js","_app/immutable/chunks/PMhZEVWn.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BiMkf7jJ.js","_app/immutable/chunks/BWQsIKAJ.js","_app/immutable/chunks/B7VUQw9k.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/generate",
				pattern: /^\/api\/generate\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/generate/_server.js'))
			},
			{
				id: "/api/ping",
				pattern: /^\/api\/ping\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/ping/_server.js'))
			},
			{
				id: "/gallery",
				pattern: /^\/gallery\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/game",
				pattern: /^\/game\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/hatching",
				pattern: /^\/hatching\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/lab",
				pattern: /^\/lab\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
