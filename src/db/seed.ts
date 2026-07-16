import { db, type PmjayPackage } from './db';

// Seed the cardiology packages matrix based on approved prices
export const resetDatabase = async () => {
  // Clear all tables for a clean slate
  await db.transaction('rw', [db.items, db.ledger, db.pmjayPackages, db.procedures, db.requisitions], async () => {
    await db.items.clear();
    await db.ledger.clear();
    await db.pmjayPackages.clear();
    await db.procedures.clear();
    await db.requisitions.clear();

    const seedPackages: Omit<PmjayPackage, 'id'>[] = [
      // 1. Pacemaker Implantation Packages
      {
        code: "MC014",
        name: "Temporary Pacemaker implantation",
        ceilingAmount: 19200,
        defaultConsumables: []
      },
      {
        code: "MC015",
        name: "Permanent Pacemaker Implantation - Single Chamber",
        ceilingAmount: 24500,
        defaultConsumables: []
      },
      {
        code: "MC016",
        name: "Permanent Pacemaker Implantation - Double Chamber",
        ceilingAmount: 33000,
        defaultConsumables: []
      },

      // 2. Interventional & Device Closure Packages
      {
        code: "MC011",
        name: "PTCA, inclusive of diagnostic angiogram",
        ceilingAmount: 32132,
        defaultConsumables: []
      },
      {
        code: "MC007",
        name: "ASD Device Closure",
        ceilingAmount: 98900,
        defaultConsumables: []
      },
      {
        code: "MC008",
        name: "VSD Device Closure",
        ceilingAmount: 109900,
        defaultConsumables: []
      },
      {
        code: "MC009",
        name: "PDA Device Closure",
        ceilingAmount: 62600,
        defaultConsumables: []
      },
      {
        code: "MC010",
        name: "PDA stenting",
        ceilingAmount: 40260,
        defaultConsumables: []
      },
      {
        code: "MC017",
        name: "Peripheral Angioplasty",
        ceilingAmount: 55500,
        defaultConsumables: []
      },

      // 3. Catheterization & Balloon Dilatation Packages
      {
        code: "MC001A",
        name: "Right Heart Catheterization",
        ceilingAmount: 10000,
        defaultConsumables: []
      },
      {
        code: "MC001B",
        name: "Left Heart Catheterization",
        ceilingAmount: 10000,
        defaultConsumables: []
      },
      {
        code: "MC005",
        name: "Balloon Mitral Valvotomy",
        ceilingAmount: 90700,
        defaultConsumables: []
      },
      {
        code: "MC006",
        name: "Balloon Atrial Septostomy",
        ceilingAmount: 24400,
        defaultConsumables: []
      },
      {
        code: "MC003A",
        name: "Coarctation of Aorta",
        ceilingAmount: 0,
        defaultConsumables: []
      },
      {
        code: "MC003B",
        name: "Pulmonary Artery Stenosis",
        ceilingAmount: 0,
        defaultConsumables: []
      },
      {
        code: "MC004A",
        name: "Balloon Pulmonary Valvotomy",
        ceilingAmount: 0,
        defaultConsumables: []
      },
      {
        code: "MC004B",
        name: "Balloon Aortic Valvotomy",
        ceilingAmount: 0,
        defaultConsumables: []
      }
    ];

    for (const pkg of seedPackages) {
      await db.pmjayPackages.add(pkg as PmjayPackage);
    }
  });
};
