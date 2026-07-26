import { db, type Item, type PmjayPackage, type LedgerEntry } from './db';
import { rateContractItems } from './rateContractItems';

// Realistic Cath Lab Items Seed Data
const seedItems: Omit<Item, 'id'>[] = [
  ...rateContractItems
];

// Predefined PMJAY Package Configurations & default consumable arrays
export const resetDatabase = async () => {
  // Clear all stores
  await db.transaction('rw', [db.items, db.ledger, db.pmjayPackages, db.procedures, db.requisitions], async () => {
    await db.items.clear();
    await db.ledger.clear();
    await db.pmjayPackages.clear();
    await db.procedures.clear();
    await db.requisitions.clear();

    // 1. Insert items and track their generated IDs using Name + Size keys
    const itemIdsByKey: Record<string, number> = {};

    for (const item of seedItems) {
      item.currentQuantity = 0; // Initialize with zero stock balance
      const id = await db.items.add(item as Item);
      
      const key = `${item.name}_${item.modelSize}`;
      itemIdsByKey[key] = id;

      // 2. Create the stock ledger audit trail entry for initial seeding
      const ledgerEntry: LedgerEntry = {
        itemId: id,
        itemName: item.name,
        category: item.category,
        timestamp: Date.now(),
        type: 'received',
        quantityChanged: 0,
        quantityAfter: 0,
        operator: "System Seeding",
        referenceId: "SEED-DATA",
        reason: "Initial database stock catalog initialization (zero balance)"
      };
      await db.ledger.add(ledgerEntry);
    }

    // Helper to safely fetch item ID by name and size
    const getIt = (name: string, size: string) => {
      const key = `${name}_${size}`;
      const id = itemIdsByKey[key];
      if (!id) {
        console.warn(`Seeding warning: Item not found for key: ${key}`);
      }
      return id || 0;
    };

    // 3. Insert PMJAY packages
    const seedPackages: Omit<PmjayPackage, 'id'>[] = [
      // 1. Pacemaker Implantation Packages (with 15% NABH markup)
      {
        code: "MC014",
        name: "Temporary Pacemaker implantation (TPI)",
        ceilingAmount: 22080,
        defaultConsumables: []
      },
      {
        code: "MC015",
        name: "Permanent Pacemaker Implantation - Single Chamber (PPI)",
        ceilingAmount: 28175,
        defaultConsumables: [
          { itemId: getIt("Radial/Brachial introducer sheath()", "202507008"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 }
        ]
      },
      {
        code: "MC016",
        name: "Permanent Pacemaker Implantation - Double Chamber (PPI)",
        ceilingAmount: 37950,
        defaultConsumables: [
          { itemId: getIt("Radial/Brachial introducer sheath()", "202507008"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 }
        ]
      },

      // 2. Interventional & Device Closure Packages (with 15% NABH markup)
      {
        code: "MC011",
        name: "PTCA, inclusive of diagnostic angiogram (PCI)",
        ceilingAmount: 32132,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Femoral Guiding Catheters - Judkins left without side holes (Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F)", "Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F"), quantity: 1 },
          { itemId: getIt("Steerable PTCA guide wires, 0.014, 180 -190 cm long, straight tip, duo core design for kink resistance with distal tip spring coil along with distal hydrophilic and silicon coating and PTFE coating of rest of the wire length with tip load  of 0.6 gm()", "202507002"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 },
          { itemId: getIt("Y-Connector Hemostatic valve(Type- push and release)", "Type- push and release"), quantity: 1 }
        ]
      },
      {
        code: "MC011A",
        name: "PTCA with 1 Stent (PCI)",
        ceilingAmount: 67966,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Femoral Guiding Catheters - Judkins left without side holes (Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F)", "Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F"), quantity: 1 },
          { itemId: getIt("Steerable PTCA guide wires, 0.014, 180 -190 cm long, straight tip, duo core design for kink resistance with distal tip spring coil along with distal hydrophilic and silicon coating and PTFE coating of rest of the wire length with tip load  of 0.6 gm()", "202507002"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 },
          { itemId: getIt("Y-Connector Hemostatic valve(Type- push and release)", "Type- push and release"), quantity: 1 },
          { itemId: getIt("Everolimus stents(biostable polymer)", "biostable polymer"), quantity: 1 }
        ]
      },
      {
        code: "MC011B",
        name: "PTCA with 2 Stents (PCI)",
        ceilingAmount: 103800,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Femoral Guiding Catheters - Judkins left without side holes (Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F)", "Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F"), quantity: 1 },
          { itemId: getIt("Steerable PTCA guide wires, 0.014, 180 -190 cm long, straight tip, duo core design for kink resistance with distal tip spring coil along with distal hydrophilic and silicon coating and PTFE coating of rest of the wire length with tip load  of 0.6 gm()", "202507002"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 },
          { itemId: getIt("Y-Connector Hemostatic valve(Type- push and release)", "Type- push and release"), quantity: 1 },
          { itemId: getIt("Everolimus stents(biostable polymer)", "biostable polymer"), quantity: 1 },
          { itemId: getIt("Zotarolimus(stents)", "stents"), quantity: 1 }
        ]
      },
      {
        code: "MC011C",
        name: "PTCA with 3 Stents (PCI)",
        ceilingAmount: 139634,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Femoral Guiding Catheters - Judkins left without side holes (Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F)", "Curves 3, 3.5, 4, 5 cm),(Size 5F/6F/7F/8F"), quantity: 1 },
          { itemId: getIt("Steerable PTCA guide wires, 0.014, 180 -190 cm long, straight tip, duo core design for kink resistance with distal tip spring coil along with distal hydrophilic and silicon coating and PTFE coating of rest of the wire length with tip load  of 0.6 gm()", "202507002"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 },
          { itemId: getIt("Y-Connector Hemostatic valve(Type- push and release)", "Type- push and release"), quantity: 1 },
          { itemId: getIt("Everolimus stents(biostable polymer)", "biostable polymer"), quantity: 2 },
          { itemId: getIt("Zotarolimus(stents)", "stents"), quantity: 1 }
        ]
      },
      {
        code: "MC007",
        name: "ASD Device Closure",
        ceilingAmount: 113735,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 },
          { itemId: getIt("Sizing balloon for ASD(Circular shape)", "Circular shape"), quantity: 1 }
        ]
      },
      {
        code: "MC008",
        name: "VSD Device Closure",
        ceilingAmount: 126385,
        defaultConsumables: []
      },
      {
        code: "MC009",
        name: "PDA Device Closure",
        ceilingAmount: 71990,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 }
        ]
      },
      {
        code: "MC010",
        name: "PDA stenting",
        ceilingAmount: 46299,
        defaultConsumables: []
      },
      {
        code: "MC017",
        name: "Peripheral Angioplasty",
        ceilingAmount: 63825,
        defaultConsumables: []
      },

      // 3. Catheterization & Balloon Dilatation Packages (with 15% NABH markup)
      {
        code: "MC001A",
        name: "Right Heart Catheterization",
        ceilingAmount: 11500,
        defaultConsumables: []
      },
      {
        code: "MC001B",
        name: "Left Heart Catheterization",
        ceilingAmount: 11500,
        defaultConsumables: []
      },
      {
        code: "MC005",
        name: "Balloon Mitral Valvotomy (BMV)",
        ceilingAmount: 104305,
        defaultConsumables: [
          { itemId: getIt("Adult Femoral introducer sheath- 10-12 cm long()", "202507005"), quantity: 1 },
          { itemId: getIt("Iopromide(Non Lonic Iodine Base Contrast Media 370mg 100ml)", "Non Lonic Iodine Base Contrast Media 370mg 100ml)(Make bayer AG Model ultravist"), quantity: 1 },
          { itemId: getIt("PTMC Balloon with accessories(without vent tube)", "without vent tube"), quantity: 1 }
        ]
      },
      {
        code: "MC006",
        name: "Balloon Atrial Septostomy",
        ceilingAmount: 28060,
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
