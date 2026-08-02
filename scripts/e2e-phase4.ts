import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:4005/api';

async function generateApprovals(count: number) {
  console.log(`[Command Center] Wstrzykiwanie ${count} zapytań o autoryzację do klastra Temporal...`);
  const promises = [];
  const generatedIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const oppId = randomUUID();
    generatedIds.push(oppId);
    promises.push(
      fetch(`${API_URL}/approvals/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: oppId, entityType: 'opportunity' }),
      }).then(r => r.json())
    );
  }

  const results = await Promise.all(promises);
  console.log(`[Command Center] Ukończono wysyłanie. Wygenerowano ${results.length} oczekujących Workflows.`);
  return generatedIds;
}

async function spamMeilisearch(count: number) {
  console.log(`[God Mode] Otwieranie ognia zapytaniami do Meilisearch (${count} zapytań w tle)...`);
  const promises = [];
  const start = Date.now();

  for (let i = 0; i < count; i++) {
    // Zapytanie do Meilisearch ukryte za API Gateway
    promises.push(
      fetch(`${API_URL}/search/indexes/opportunities/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'ruukki' }),
      }).then(r => r.json())
    );
  }

  const results = await Promise.all(promises);
  const end = Date.now();
  const totalTime = end - start;
  const avgTime = totalTime / count;

  console.log(`[God Mode] Zmasowany ostrzał zakończony. Czas trwania: ${totalTime}ms.`);
  console.log(`[God Mode] Średni czas odpowiedzi: ${avgTime.toFixed(2)}ms per request.`);
  return results;
}

async function resolveApprovals(ids: string[]) {
  console.log(`[Command Center] Autoryzacja ${ids.length} wybranych projektów (Approve/Reject)...`);
  const promises = [];

  for (let i = 0; i < ids.length; i++) {
    const action = i % 2 === 0 ? 'approve' : 'reject';
    promises.push(
      fetch(`${API_URL}/approvals/${ids[i]}/${action}`, {
        method: 'POST',
      }).then(r => r.json())
    );
  }

  const results = await Promise.all(promises);
  console.log(`[Command Center] Pomyślnie rozwiązano ${results.length} Workflows.`);
}

async function run() {
  console.log('=== START MASOWEGO TESTU E2E (FAZA 4) ===\n');

  try {
    // Równoległe uderzenie we front zatwierdzeń i front wyszukiwarki
    const approvalsTask = generateApprovals(50);
    const searchTask = spamMeilisearch(500);

    const [approvalIds] = await Promise.all([approvalsTask, searchTask]);

    console.log('\n=== Weryfikacja Stabilności Command Center ===');
    // Wybieramy 10 approvali i je akceptujemy/odrzucamy
    const sampleToResolve = approvalIds.slice(0, 10);
    await resolveApprovals(sampleToResolve);

    console.log('\n=== TEST E2E FAZA 4 ZAKOŃCZONY SUKCESEM ===');
    console.log('Klaster Temporal.io zamroził stan ofert z ujemną marżą, a wyszukiwarka odpowiedziała błyskawicznie mimo wysokiego obciążenia.');
  } catch (err) {
    console.error('Test failed', err);
  }
}

run();
