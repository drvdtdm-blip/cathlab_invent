import { db, type PmjayPackage } from './db';



// Predefined PMJAY Package Configurations with zero initial consumables
export const resetDatabase = async () => {
  // Clear all stores to ensure a 100% clean database
  await db.transaction('rw', [db.items, db.ledger, db.pmjayPackages, db.procedures, db.requisitions], async () => {
    await db.items.clear();
    await db.ledger.clear();
    await db.pmjayPackages.clear();
    await db.procedures.clear();
    await db.requisitions.clear();

    // Seed the standard PMJAY packages (MP HBP 2022 rates) without preloaded items
    const seedPackages: Omit<PmjayPackage, 'id'>[] = [
      {
        code: "MC001A",
        name: "Coronary Angiography (Diagnostic) Package",
        ceilingAmount: 11000,
        defaultConsumables: []
      },
      {
        code: "MC011A",
        name: "PCI (Percutaneous Coronary Intervention) Package",
        ceilingAmount: 62212,
        defaultConsumables: []
      },
      {
        code: "MC016A",
        name: "PPI (Permanent Pacemaker - Double Chamber) Package",
        ceilingAmount: 108000,
        defaultConsumables: []
      },
      {
        code: "MC005A",
        name: "BMV (Balloon Mitral Valvuloplasty) Package",
        ceilingAmount: 90700,
        defaultConsumables: []
      },
      {
        code: "MC007A",
        name: "ASD Device Closure Package",
        ceilingAmount: 98900,
        defaultConsumables: []
      },
      {
        code: "MC009A",
        name: "PDA Device Closure Package",
        ceilingAmount: 62600,
        defaultConsumables: []
      },
      {
        code: "MC015A",
        name: "PPI (Permanent Pacemaker - Single Chamber) Package",
        ceilingAmount: 69500,
        defaultConsumables: []
      }
    ];

    for (const pkg of seedPackages) {
      await db.pmjayPackages.add(pkg as PmjayPackage);
    }
  });
};
