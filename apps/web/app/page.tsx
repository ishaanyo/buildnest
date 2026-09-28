export default function Home() {
  return (
    <main>
      <h1>BuildNest API</h1>
      <p>AI Room Interior Design · Material Cost · Labor Packages</p>
      <ul>
        <li><code>GET /api/health</code></li>
        <li><code>GET /api/themes</code></li>
        <li><code>GET /api/materials</code></li>
        <li><code>POST /api/upload</code> — multipart file</li>
        <li><code>POST /api/projects</code> — {"{ sourceImageUrl, themeSlug, roomType }"}</li>
        <li><code>POST /api/orders</code> — {"{ projectId, includeLabor }"}</li>
      </ul>
    </main>
  );
}
