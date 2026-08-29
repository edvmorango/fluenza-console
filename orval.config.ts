import { defineConfig } from 'orval';

export default defineConfig({
  fluenza: {
    input: {
      target: 'http://localhost:8000/docs/Fluenza+API.json',
      // zio-http's OpenAPIGen doesn't emit a `description` on every response object, which
      // strict OpenAPI 3.1 validation flags - the spec is otherwise correct, this is just a
      // missing-doc-string lint, not an actual schema problem.
      unsafeDisableValidation: true,
    },
    output: {
      clean: true,
      mode: 'tags-split',
      target: './src/generated/api/endpoints.ts',
      schemas: './src/generated/api/model',
      client: 'react-query',
      httpClient: 'fetch',
      baseUrl: '/api/fluenza',
      override: {
        // Our mutator returns the bare parsed body, not a { data, status } wrapper - keep the
        // generated types matching what it actually returns.
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: './src/lib/api-mutator.ts',
          name: 'apiFetch',
        },
      },
    },
  },
});
