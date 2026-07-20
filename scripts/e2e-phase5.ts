import { PrismaClient as HrPrisma } from '../node_modules/@prisma/client-hr';
import { PrismaClient as MesPrisma } from '../node_modules/.prisma/client-mes';
import { PrismaClient as PmPrisma } from '../node_modules/.prisma/client-pm';

const hrPrisma = new HrPrisma();
const mesPrisma = new MesPrisma();
const pmPrisma = new PmPrisma();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== START E2E TEST (FAZA 5): KIOSK PRACOWNIKA ===\n');

  // 1. Setup HR Data
  console.log('[Setup] Przygotowanie danych HR...');
  const employee1 = await hrPrisma.employee.upsert({
    where: { badgeId: 'BADGE-001' },
    update: {},
    create: {
      badgeId: 'BADGE-001',
      firstName: 'Jan',
      lastName: 'Spawacz',
      hourlyRate: 60.0,
      certifications: {
        create: [
          { name: 'WELDING_TIG', validUntil: new Date('2030-01-01') }
        ]
      }
    }
  });

  const employee2 = await hrPrisma.employee.upsert({
    where: { badgeId: 'BADGE-002' },
    update: {},
    create: {
      badgeId: 'BADGE-002',
      firstName: 'Anna',
      lastName: 'Nowak',
      hourlyRate: 50.0,
      certifications: {
        create: [
          { name: 'WELDING_TIG', validUntil: new Date('2020-01-01') } // Expired!
        ]
      }
    }
  });
  console.log(`[Setup] Utworzono pracowników: ${employee1.badgeId} (ważny certyfikat), ${employee2.badgeId} (wygasły certyfikat).`);

  // 2. Setup PM Data
  console.log('[Setup] Przygotowanie danych PM...');
  const project = await pmPrisma.project.create({
    data: {
      name: 'Projekt ETO - Symulacja Kiosku',
      baselineCost: 10000,
      actualLaborCost: 0,
      status: 'ACCEPTED'
    }
  });
  console.log(`[Setup] Utworzono projekt ETO: ${project.id}. Actual Labor Cost = 0 PLN.`);

  // 3. Setup MES Data
  console.log('[Setup] Przygotowanie danych MES...');
  const workOrder = await mesPrisma.workOrder.create({
    data: {
      orderNumber: 'WO-KIOSK-' + Date.now(),
      projectId: project.id,
      quantity: 1,
      status: 'PENDING'
    }
  });

  const operation = await mesPrisma.operation.create({
    data: {
      workOrderId: workOrder.id,
      sequence: 10,
      name: 'Spawanie Głównej Ramy',
      requiredCertifications: ['WELDING_TIG'],
    }
  });
  console.log(`[Setup] Utworzono operację MES: Wymaga certyfikatu 'WELDING_TIG'.\n`);

  // 4. Test 1: Clock In - Anna (Wygasły Certyfikat)
  console.log('--- TEST 1: Weryfikacja Blokady Kompetencyjnej (Skill-Based Routing) ---');
  console.log(`[Kiosk] Operator ${employee2.badgeId} próbuje rozpocząć pracę...`);
  
  try {
    const res = await fetch('http://127.0.0.1:4005/api/mes/kiosk/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId: employee2.badgeId, operationId: operation.id })
    });
    
    const body = await res.json();
    if (res.status === 403 && body.reason === 'CERTIFICATION_FAILED') {
      console.log(`[SUKCES] Odmowa dostępu. Pracownik posiada wygasły certyfikat: ${body.expired.join(', ')}.`);
    } else {
      console.error('[BŁĄD] System nie zablokował pracownika bez ważnych uprawnień!');
    }
  } catch (err) {
    console.error('Błąd połączenia:', err);
  }

  // 5. Test 2: Clock In - Jan (Ważny Certyfikat)
  console.log('\n--- TEST 2: Poprawne logowanie do Kiosku i Czas Pracy ---');
  console.log(`[Kiosk] Operator ${employee1.badgeId} próbuje rozpocząć pracę...`);
  let sessionId = null;
  try {
    const res = await fetch('http://127.0.0.1:4005/api/mes/kiosk/clock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId: employee1.badgeId, operationId: operation.id })
    });
    const body = await res.json();
    if (res.status === 201 || res.status === 200) {
      sessionId = body.sessionId;
      console.log(`[SUKCES] Autoryzacja poprawna. Utworzono sesję: ${sessionId}.`);
    } else {
      console.error('[BŁĄD] Nie można zalogować pracownika z ważnym certyfikatem.', body);
    }
  } catch (err) {
    console.error('Błąd połączenia:', err);
  }

  if (sessionId) {
    console.log(`[Kiosk] Operator pracuje (symulacja 3 sekund)...`);
    await delay(3000); // Wait 3 seconds
    
    // We will artificially modify the session startedAt in DB to simulate 1 hour of work
    // because we don't want to wait 1 hour in E2E test.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await mesPrisma.operatorSession.update({
      where: { id: sessionId },
      data: { startedAt: oneHourAgo }
    });

    console.log(`[Kiosk] Operator ${employee1.badgeId} kończy zadanie (clock-out)...`);
    try {
      const resOut = await fetch('http://127.0.0.1:4005/api/mes/kiosk/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const bodyOut = await resOut.json();
      console.log(`[Kiosk] Wyrejestrowano. Czas pracy: ${bodyOut.durationMinutes.toFixed(2)} min. Koszt: ${bodyOut.laborCost.toFixed(2)} PLN.`);
    } catch (err) {
      console.error('Błąd przy clock-out:', err);
    }
  }

  // 6. Test 3: Weryfikacja Chirurgicznego Zegara Kosztowego (PM)
  console.log('\n--- TEST 3: Weryfikacja Chirurgicznego Zegara Kosztowego w module PM ---');
  console.log('[PM] Oczekiwanie na przetworzenie zdarzenia NATS (mes.labor.cost_recorded)...');
  await delay(1000); // wait for NATS to process

  const updatedProject = await pmPrisma.project.findUnique({
    where: { id: project.id }
  });

  if (updatedProject && updatedProject.actualLaborCost > 0) {
    console.log(`[SUKCES] Konto projektowe zostało obciążone! Actual Labor Cost wynosi teraz: ${updatedProject.actualLaborCost.toFixed(2)} PLN (Oczekiwano: ~60.00 PLN).`);
  } else {
    console.error('[BŁĄD] Konto projektowe nie zostało obciążone. Zdarzenie NATS mogło nie dotrzeć.');
  }

  console.log('\n=== TEST E2E ZAKOŃCZONY ===');
  
  // Cleanup
  await hrPrisma.$disconnect();
  await mesPrisma.$disconnect();
  await pmPrisma.$disconnect();
}

run().catch(console.error);
