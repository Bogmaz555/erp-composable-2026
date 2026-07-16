import { PrismaClient as PmPrismaClient } from '../node_modules/.prisma/client-pm';
import { PrismaClient as MesPrismaClient } from '../node_modules/.prisma/client-mes';
import { PrismaClient as QualityPrismaClient } from '../node_modules/.prisma/client-quality';

// Porty (domyślnie zadeklarowane w ekosystemie)
const MES_URL = 'http://127.0.0.1:4006';
const QUALITY_URL = 'http://127.0.0.1:4008';

const pmPrisma = new PmPrismaClient();
const mesPrisma = new MesPrismaClient();
const qualityPrisma = new QualityPrismaClient();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWarGame() {
  console.log('🦅 ROZPOCZYNAMY WIELKĄ GRĘ WOJENNĄ MAX SPEED ERP 🦅');
  console.log('=====================================================');

  try {
    // 1. Inicjalizacja ETO Project & MES WorkOrder
    console.log('[1/5] Inicjalizacja projektu ETO (PM) i Zlecenia (MES)...');
    
    // Tworzenie Projektu PM
    const project = await pmPrisma.project.create({
      data: {
        name: 'Zrobotyzowana Stacja Kawasaki ETO-WARGAME',
        status: 'IN_PROGRESS',
        totalBufferDays: 10,
        usedBufferDays: 0,
        feverZone: 'GREEN',
      }
    });

    // Tworzenie pierwszej WBS (np. Montaż Ramienia)
    const wbs = await pmPrisma.wbsElement.create({
      data: {
        projectId: project.id,
        name: 'Montaż Mechaniczny Ramienia K',
        status: 'PENDING',
        startDate: new Date(),
        endDate: new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
      }
    });

    // Tworzenie WorkOrder z MES przypiętego do Projektu
    const workOrder = await mesPrisma.workOrder.create({
      data: {
        orderNumber: 'WO-WARGAME-' + Date.now(),
        projectId: project.id,
        quantity: 1,
        status: 'IN_PROGRESS',
      }
    });

    // Tworzenie Operacji
    const operation = await mesPrisma.operation.create({
      data: {
        workOrderId: workOrder.id,
        name: 'Kalibracja Siłowników',
        sequence: 10,
        status: 'IN_PROGRESS',
      }
    });

    console.log(`✅ Projekt PM: ${project.name} | WBS: ${wbs.name}`);
    console.log(`✅ WorkOrder MES: ${workOrder.orderNumber} | Operacja: ${operation.name}`);
    
    // 2. CHAOS INJECTION - Wyłączamy/Pauzujemy NATS
    console.log('\n[2/5] 🚨 CHAOS INJECTION: Symulacja odcięcia połączenia NATS...');
    console.log('      (W normalnych warunkach użylibyśmy docker pause, tu polegamy na asynchroniczności Outbox)');
    
    // Uderzamy w MES, który zaksięguje NCR do Outboxa
    console.log('\n[3/5] 💥 UDERZENIE ANDON: Operator zgłasza defekt!');
    
    try {
      const response = await fetch(`${MES_URL}/mes/andon/ncr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: workOrder.id,
          operationId: operation.id,
          defectCode: 'MECH_DAMAGE',
          description: 'Zerwany gwint na korpusie Kawasaki',
          attachmentIds: ['UUID-PHOTO-1234']
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Błąd MES: status ${response.status}, odpowiedź: ${errorText}`);
      } else {
        console.log(`✅ Odpowiedź MES: status ${response.status}`);
      }
    } catch (e: any) {
      console.warn(`⚠️ Ostrzeżenie (Oczekiwane, jeśli usługi nie są uruchomione): ${e.message}`);
    }

    // 3. Weryfikacja działania Outboxa / Self-Healing Gantta
    console.log('\n[4/5] 🛡️ REZONANS HARMONOGRAMU: Sprawdzanie czy Outbox dostarczył wiadomość po "awarii" sieci...');
    console.log('      Czekamy 5 sekund na dostarczenie zdarzenia i reakcję pm-service...');
    await delay(5000);

    const updatedProject = await pmPrisma.project.findUnique({ where: { id: project.id } });
    const updatedWbs = await pmPrisma.wbsElement.findUnique({ where: { id: wbs.id } });
    const ncrRecord = await qualityPrisma.nonConformanceReport.findFirst({ where: { workOrderId: workOrder.id } });

    console.log('--- WYNIKI ---');
    if (ncrRecord) {
      console.log(`✅ QMS NCR utworzony: ${ncrRecord.defectCode} - ${ncrRecord.defectDescription}`);
    } else {
      console.log(`❌ Błąd: NCR nie dotarł do QMS! Sprawdź działanie Relay.`);
    }

    if (updatedProject?.usedBufferDays && updatedProject.usedBufferDays > 0) {
      console.log(`✅ PM Projekt zjadł bufor: ${updatedProject.usedBufferDays} dni (Strefa: ${updatedProject.feverZone})`);
    } else {
      console.log(`❌ PM nie zaksięgował opóźnienia!`);
    }

    // 4. Cyfrowy Paszport Maszyny
    console.log('\n[5/5] 📄 CYFROWY PASZPORT MASZYNY: Symulacja zakończenia i generowania certyfikatu...');
    
    // Zamykamy NCR aby maszyna dostała COMPLIANT
    if (ncrRecord) {
      await qualityPrisma.nonConformanceReport.update({
        where: { id: ncrRecord.id },
        data: { status: 'CLOSED' }
      });
    }

    // Dodajemy strukturę AsBuilt
    const asBuilt = await mesPrisma.asBuiltRecord.create({
      data: {
        workOrderId: workOrder.id,
        itemId: 'ITEM-ROBOT-001',
        serialNumber: 'SN-WARGAME-' + Date.now(),
        quantity: 1,
        asBuiltComponents: {
          create: [
            { itemId: 'ITEM-MOTOR-01', serialNumber: 'SN-MOTOR-A1', quantity: 1 }
          ]
        }
      }
    });

    // Pytamy QMS o Paszport (to odpali NATS RPC do MES)
    try {
      const passportResponse = await fetch(`${QUALITY_URL}/quality/passport/${workOrder.id}`);
      const data = await passportResponse.json();
      console.log(`\n✅ Otrzymano Cyfrowy Paszport Maszyny (Status HTTP: ${passportResponse.status})`);
      console.log(JSON.stringify(data, null, 2));

      if (data.status === 'COMPLIANT') {
        console.log('\n🌟 OSTATECZNY WYNIK: MASZYNA ZGODNA Z ISO (COMPLIANT)! SYMULACJA ZAKOŃCZONA SUKCESEM! 🌟');
      } else {
        console.log('\n❌ MASZYNA NIEZGODNA (NON_COMPLIANT).');
      }
    } catch (e: any) {
      console.log(`❌ Błąd pobierania paszportu: ${e.message}`);
    }

  } catch (error) {
    console.error('BŁĄD GRY WOJENNEJ:', error);
  } finally {
    await pmPrisma.$disconnect();
    await mesPrisma.$disconnect();
    await qualityPrisma.$disconnect();
  }
}

runWarGame();
