import { db, type Item, type PmjayPackage, type LedgerEntry } from './db';

// Realistic Cath Lab Items Seed Data
const seedItems: Omit<Item, 'id'>[] = [
  {
    name: "XIENCE Sierra Everolimus-Eluting Stent",
    category: "stent",
    manufacturer: "Abbott",
    modelSize: "3.00mm x 18mm",
    batchLotNo: "XSR-10293",
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 180 days out
    unitCost: 23600,
    currentQuantity: 12,
    reorderLevel: 3,
    storageLocation: "Cabinet A-1"
  },
  {
    name: "Resolute Onyx Zotarolimus-Eluting Stent",
    category: "stent",
    manufacturer: "Medtronic",
    modelSize: "2.75mm x 22mm",
    batchLotNo: "RON-99482",
    expiryDate: new Date(Date.now() + 240 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 240 days out
    unitCost: 23600,
    currentQuantity: 10,
    reorderLevel: 3,
    storageLocation: "Cabinet A-2"
  },
  {
    name: "Synergy Everolimus-Eluting Stent",
    category: "stent",
    manufacturer: "Boston Scientific",
    modelSize: "3.25mm x 16mm",
    batchLotNo: "SYN-33821",
    expiryDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expiring in 25 days! (Low stock & Expiry warning)
    unitCost: 23600,
    currentQuantity: 2,
    reorderLevel: 3,
    storageLocation: "Cabinet A-1"
  },
  {
    name: "Sapphire II NC PTCA Balloon",
    category: "balloon",
    manufacturer: "OrbusNeich",
    modelSize: "2.50mm x 12mm",
    batchLotNo: "SNC-22048",
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 7500,
    currentQuantity: 15,
    reorderLevel: 4,
    storageLocation: "Drawer B-3"
  },
  {
    name: "Emerge PTCA Dilatation Balloon",
    category: "balloon",
    manufacturer: "Boston Scientific",
    modelSize: "2.00mm x 15mm",
    batchLotNo: "EMG-77491",
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expiring in 15 days
    unitCost: 6800,
    currentQuantity: 8,
    reorderLevel: 4,
    storageLocation: "Drawer B-4"
  },
  {
    name: "Inoue BMV Balloon",
    category: "balloon",
    manufacturer: "Toray",
    modelSize: "26mm",
    batchLotNo: "INO-44021",
    expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 42000,
    currentQuantity: 4,
    reorderLevel: 1,
    storageLocation: "Cabinet C-1"
  },
  {
    name: "Adapta Dual Chamber Pacemaker",
    category: "pacemaker",
    manufacturer: "Medtronic",
    modelSize: "ADDR01 (Dual Chamber)",
    batchLotNo: "ADP-33291",
    expiryDate: new Date(Date.now() + 720 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 115000,
    currentQuantity: 5,
    reorderLevel: 1,
    storageLocation: "Pacemaker Shelf 1"
  },
  {
    name: "Assurity MRI Single Chamber Pacemaker",
    category: "pacemaker",
    manufacturer: "Abbott",
    modelSize: "PM1272 (Single Chamber)",
    batchLotNo: "ASS-88192",
    expiryDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expiring in 50 days
    unitCost: 85000,
    currentQuantity: 3,
    reorderLevel: 1,
    storageLocation: "Pacemaker Shelf 2"
  },
  {
    name: "Radifocus Introducer II Sheath",
    category: "sheath",
    manufacturer: "Terumo",
    modelSize: "6F 11cm",
    batchLotNo: "RAD-66712",
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 1200,
    currentQuantity: 30,
    reorderLevel: 10,
    storageLocation: "Drawer C-1"
  },
  {
    name: "Radifocus Introducer II Sheath",
    category: "sheath",
    manufacturer: "Terumo",
    modelSize: "5F 11cm",
    batchLotNo: "RAD-55102",
    expiryDate: new Date(Date.now() + 290 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 1200,
    currentQuantity: 20,
    reorderLevel: 8,
    storageLocation: "Drawer C-2"
  },
  {
    name: "Launcher Guide Catheter",
    category: "catheter",
    manufacturer: "Medtronic",
    modelSize: "JL4 6F",
    batchLotNo: "LGC-44812",
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 8500,
    currentQuantity: 10,
    reorderLevel: 3,
    storageLocation: "Catheter Hanger 1"
  },
  {
    name: "Launcher Guide Catheter",
    category: "catheter",
    manufacturer: "Medtronic",
    modelSize: "JR4 6F",
    batchLotNo: "LGC-44919",
    expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 8500,
    currentQuantity: 10,
    reorderLevel: 3,
    storageLocation: "Catheter Hanger 2"
  },
  {
    name: "Judkins Diagnostic Catheter",
    category: "catheter",
    manufacturer: "Cordis",
    modelSize: "JL4 5F",
    batchLotNo: "JDC-10928",
    expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 2200,
    currentQuantity: 15,
    reorderLevel: 5,
    storageLocation: "Catheter Hanger 4"
  },
  {
    name: "Judkins Diagnostic Catheter",
    category: "catheter",
    manufacturer: "Cordis",
    modelSize: "JR4 5F",
    batchLotNo: "JDC-10929",
    expiryDate: new Date(Date.now() + 500 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 2200,
    currentQuantity: 15,
    reorderLevel: 5,
    storageLocation: "Catheter Hanger 5"
  },
  {
    name: "Runthrough NS Coronary Guidewire",
    category: "guidewire",
    manufacturer: "Terumo",
    modelSize: "0.014in x 180cm",
    batchLotNo: "RUN-99218",
    expiryDate: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 4500,
    currentQuantity: 25,
    reorderLevel: 8,
    storageLocation: "Guidewire Rack A"
  },
  {
    name: "Whisper MS Guidewire",
    category: "guidewire",
    manufacturer: "Abbott",
    modelSize: "0.014in x 190cm",
    batchLotNo: "WHI-00291",
    expiryDate: new Date(Date.now() + 110 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 5200,
    currentQuantity: 12,
    reorderLevel: 4,
    storageLocation: "Guidewire Rack B"
  },
  {
    name: "Angio-Seal VIP Vascular Closure Device",
    category: "closure device",
    manufacturer: "Terumo",
    modelSize: "6F",
    batchLotNo: "ASE-88491",
    expiryDate: new Date(Date.now() + 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expiring in 95 days
    unitCost: 13500,
    currentQuantity: 8,
    reorderLevel: 2,
    storageLocation: "Cabinet B-1"
  },
  {
    name: "Amplatzer Septal Occluder",
    category: "closure device",
    manufacturer: "Abbott",
    modelSize: "ASD 24mm",
    batchLotNo: "ASD-24018",
    expiryDate: new Date(Date.now() + 600 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 180000,
    currentQuantity: 3,
    reorderLevel: 1,
    storageLocation: "Cabinet C-3"
  },
  {
    name: "Amplatzer Duct Occluder",
    category: "closure device",
    manufacturer: "Abbott",
    modelSize: "PDA 8/6",
    batchLotNo: "PDA-08061",
    expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Expired 5 days ago! (Expired Alert)
    unitCost: 125000,
    currentQuantity: 1,
    reorderLevel: 1,
    storageLocation: "Cabinet C-3"
  },
  {
    name: "Omnipaque Contrast Media 350mg/ml",
    category: "consumable",
    manufacturer: "GE Healthcare",
    modelSize: "100ml",
    batchLotNo: "OMN-55281",
    expiryDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 1800,
    currentQuantity: 40,
    reorderLevel: 15,
    storageLocation: "Contrast Room A"
  },
  {
    name: "Coronary Y-Connector Kit",
    category: "consumable",
    manufacturer: "Merit Medical",
    modelSize: "Push-Click Type",
    batchLotNo: "YCK-11029",
    expiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    unitCost: 3200,
    currentQuantity: 20,
    reorderLevel: 6,
    storageLocation: "Drawer E-2"
  }
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

    // 1. Insert items and track their generated IDs
    const itemIdsByName: Record<string, number> = {};

    for (const item of seedItems) {
      const id = await db.items.add(item as Item);
      itemIdsByName[item.name] = id;

      // 2. Create the stock ledger audit trail entry for initial seeding
      const ledgerEntry: LedgerEntry = {
        itemId: id,
        itemName: item.name,
        category: item.category,
        timestamp: Date.now(),
        type: 'received',
        quantityChanged: item.currentQuantity,
        quantityAfter: item.currentQuantity,
        operator: "System Seeding",
        referenceId: "SEED-DATA",
        reason: "Initial database stock initialization"
      };
      await db.ledger.add(ledgerEntry);
    }

    // Helpers to safely fetch item ID
    const getIt = (name: string) => itemIdsByName[name] || 0;

    // 3. Insert PMJAY packages
    const seedPackages: Omit<PmjayPackage, 'id'>[] = [
      {
        code: "MC011A",
        name: "PCI (Percutaneous Coronary Intervention) Package",
        ceilingAmount: 62212,
        defaultConsumables: [
          { itemId: getIt("Radifocus Introducer II Sheath"), quantity: 1 }, // 6F 11cm
          { itemId: getIt("Launcher Guide Catheter"), quantity: 1 }, // JL4 6F
          { itemId: getIt("Runthrough NS Coronary Guidewire"), quantity: 1 },
          { itemId: getIt("Omnipaque Contrast Media 350mg/ml"), quantity: 1 },
          { itemId: getIt("Coronary Y-Connector Kit"), quantity: 1 },
          { itemId: getIt("XIENCE Sierra Everolimus-Eluting Stent"), quantity: 1 }
        ]
      },
      {
        code: "MC016A",
        name: "PPI (Permanent Pacemaker - Double Chamber) Package",
        ceilingAmount: 108000,
        defaultConsumables: [
          { itemId: getIt("Radifocus Introducer II Sheath") + 1, quantity: 1 }, // Terumo 5F 11cm sheath (next item index)
          { itemId: getIt("Adapta Dual Chamber Pacemaker"), quantity: 1 },
          { itemId: getIt("Omnipaque Contrast Media 350mg/ml"), quantity: 1 }
        ]
      },
      {
        code: "MC005A",
        name: "BMV (Balloon Mitral Valvuloplasty) Package",
        ceilingAmount: 90700,
        defaultConsumables: [
          { itemId: getIt("Radifocus Introducer II Sheath"), quantity: 1 }, // 6F 11cm
          { itemId: getIt("Omnipaque Contrast Media 350mg/ml"), quantity: 1 },
          { itemId: getIt("Inoue BMV Balloon"), quantity: 1 }
        ]
      },
      {
        code: "MC007A",
        name: "ASD Device Closure Package",
        ceilingAmount: 98900,
        defaultConsumables: [
          { itemId: getIt("Radifocus Introducer II Sheath"), quantity: 1 },
          { itemId: getIt("Omnipaque Contrast Media 350mg/ml"), quantity: 1 },
          { itemId: getIt("Amplatzer Septal Occluder"), quantity: 1 }
        ]
      },
      {
        code: "MC009A",
        name: "PDA Device Closure Package",
        ceilingAmount: 62600,
        defaultConsumables: [
          { itemId: getIt("Radifocus Introducer II Sheath"), quantity: 1 },
          { itemId: getIt("Omnipaque Contrast Media 350mg/ml"), quantity: 1 },
          { itemId: getIt("Amplatzer Duct Occluder"), quantity: 1 }
        ]
      },
      {
        code: "MC015A",
        name: "PPI (Permanent Pacemaker - Single Chamber) Package",
        ceilingAmount: 69500,
        defaultConsumables: [
          { itemId: getIt("Radifocus Introducer II Sheath") + 1, quantity: 1 },
          { itemId: getIt("Assurity MRI Single Chamber Pacemaker"), quantity: 1 },
          { itemId: getIt("Omnipaque Contrast Media 350mg/ml"), quantity: 1 }
        ]
      }
    ];

    // Fix up Terumo 5F sheath index manually to ensure accuracy
    const sheath5F = seedItems.find(i => i.name === "Radifocus Introducer II Sheath" && i.modelSize === "5F 11cm");
    if (sheath5F) {
      // Find exact ID of 5F
      const itemsAll = await db.items.toArray();
      const match5F = itemsAll.find(i => i.name === "Radifocus Introducer II Sheath" && i.modelSize === "5F 11cm");
      if (match5F && match5F.id) {
        seedPackages[1].defaultConsumables[0].itemId = match5F.id;
        seedPackages[5].defaultConsumables[0].itemId = match5F.id;
      }
    }

    for (const pkg of seedPackages) {
      await db.pmjayPackages.add(pkg as PmjayPackage);
    }
  });
};
