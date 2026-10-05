import {
  PrismaClient,
  Role,
  UserStatus,
  OrderStatus,
  AssignmentStatus,
  TransportPolicy,
  PaymentMethod,
  PayoutSource,
  OrderPaymentType,
  AdminCompensationType,
  AdminAccrualStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

async function main() {
  console.log("🌱 Seed: очищаем данные…");

  await prisma.adminPayment.deleteMany({});
  await prisma.adminAccrual.deleteMany({});
  await prisma.adminCompensation.deleteMany({});
  await prisma.agencySettings.deleteMany({});
  await prisma.orderChange.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderPayment.deleteMany({});
  await prisma.orderAnimator.deleteMany({});
  await prisma.orderSlot.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.expenseCategory.deleteMany({});
  await prisma.characterPriceOption.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.rate.deleteMany({});
  await prisma.rateGroup.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.appSetting.deleteMany({});

  console.log("🌱 Seed: создаём пользователей…");

  const directorPass = await hashPassword("superpassword123");
  const animPass = await hashPassword("animpass123");

  const director = await prisma.user.create({
    data: {
      role: Role.director,
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79001234567",
      email: "director@example.com",
      passwordHash: directorPass,
      status: UserStatus.active,
    },
  });

  const admin = await prisma.user.create({
    data: {
      role: Role.admin,
      firstName: "Ольга",
      lastName: "Петрова",
      phone: "+79002223344",
      passwordHash: await hashPassword("adminpass123"),
      status: UserStatus.active,
    },
  });

  const anim1 = await prisma.user.create({
    data: {
      role: Role.animator,
      firstName: "Анна",
      lastName: "Сидорова",
      phone: "+79007778899",
      email: "anna@example.com",
      passwordHash: animPass,
      status: UserStatus.active,
    },
  });

  const anim2 = await prisma.user.create({
    data: {
      role: Role.animator,
      firstName: "Пётр",
      lastName: "Кузнецов",
      phone: "+79005556677",
      email: "petr@example.com",
      passwordHash: await hashPassword("animpass123"),
      status: UserStatus.active,
    },
  });

  console.log(`   ✓ director: ${director.phone}`);
  console.log(`   ✓ admin:    ${admin.phone}`);
  console.log(`   ✓ animator: ${anim1.phone}`);
  console.log(`   ✓ animator: ${anim2.phone}`);

  console.log("🌱 Seed: настройки агентства (singleton)…");
  await prisma.agencySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Event Agency",
      legalName: "ИП Иванов И.И.",
      inn: "770123456789",
      phone: "+74951234567",
      email: "hello@event-agency.ru",
      address: "Москва, ул. Тверская, 1",
      website: "https://event-agency.ru",
      timezone: "Europe/Moscow",
      currency: "RUB",
      paymentDetails: "Р/с 40802810... Тинькофф Банк",
      defaultPrepaymentPercent: 30,
    },
  });
  console.log("   ✓ agency_settings");

  console.log("🌱 Seed: оплата админа (Ольга — 7%)…");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.adminCompensation.create({
    data: {
      adminId: admin.id,
      type: AdminCompensationType.percent,
      percentValue: 7,
      fixedAmount: null,
      effectiveFrom: today,
    },
  });
  console.log("   ✓ admin_compensation (percent 7%)");

  console.log("🌱 Seed: создаём клиентов…");

  const client1 = await prisma.client.create({
    data: {
      name: "Петров Пётр",
      phone: "+79001112233",
      email: "petrov@example.com",
      address: "Москва, ул. Тверская, 10",
      notes: "Постоянный клиент, дни рождения",
      createdBy: director.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Смирнова Елена",
      phone: "+79003334455",
      email: "smirnova@example.com",
      address: "Москва, ул. Арбат, 5",
      notes: "Корпоративы",
      createdBy: admin.id,
    },
  });

  console.log(`   ✓ client: ${client1.name}`);
  console.log(`   ✓ client: ${client2.name}`);

  console.log("🌱 Seed: создаём группы ставок…");

  const grpSimple = await prisma.rateGroup.create({
    data: { name: "Простые аниматоры", sortOrder: 1 },
  });
  const grpMascot = await prisma.rateGroup.create({
    data: { name: "Ростовые куклы", sortOrder: 2 },
  });
  const grpShow = await prisma.rateGroup.create({
    data: { name: "Шоу-программы", sortOrder: 3 },
  });
  const grpHost = await prisma.rateGroup.create({
    data: { name: "Ведущий", sortOrder: 4 },
  });
  const grpPhoto = await prisma.rateGroup.create({
    data: { name: "Фотограф", sortOrder: 5 },
  });
  const grpAddon = await prisma.rateGroup.create({
    data: { name: "Дополнения", sortOrder: 6 },
  });

  console.log("   ✓ 6 групп");

  console.log("🌱 Seed: создаём персонажей и их цены…");

  // Цены для клиента — по группам, по длительностям
  const defaultPrices: Record<string, Record<number, number>> = {
    [grpSimple.id]: { 30: 2500, 40: 3000, 45: 3500, 60: 4500, 90: 6500, 120: 8500, 180: 12000 },
    [grpMascot.id]: { 30: 3500, 40: 4000, 45: 4500, 60: 5500, 90: 8000, 120: 10000, 180: 14000 },
    [grpShow.id]:   { 30: 5000, 40: 6000, 45: 6500, 60: 8000, 90: 11000, 120: 14000, 180: 19000 },
    [grpHost.id]:   { 60: 8000, 90: 11000, 120: 14000, 180: 19000 },
    [grpPhoto.id]:  { 60: 6000, 90: 8500, 120: 11000, 180: 15000 },
    [grpAddon.id]:  { 30: 2500, 45: 3500, 60: 4000, 90: 6000, 120: 8000 },
  };

  const charactersData = [
    { name: "Пират Джек",          rateGroupId: grpSimple.id },
    { name: "Принцесса Эльза",     rateGroupId: grpSimple.id },
    { name: "Человек-паук",        rateGroupId: grpSimple.id },
    { name: "Супермен",            rateGroupId: grpSimple.id },
    { name: "Микки Маус",          rateGroupId: grpMascot.id },
    { name: "Медведь Топтыгин",    rateGroupId: grpMascot.id },
    { name: "Зайка Степашка",      rateGroupId: grpMascot.id },
    { name: "Шоу мыльных пузырей", rateGroupId: grpShow.id },
    { name: "Научное шоу",         rateGroupId: grpShow.id },
    { name: "Шоу трансформеров",   rateGroupId: grpShow.id },
    { name: "Ведущий (стандарт)",  rateGroupId: grpHost.id },
    { name: "Фотограф",            rateGroupId: grpPhoto.id },
    { name: "Аквагрим",            rateGroupId: grpAddon.id },
    { name: "Шарики (Твистинг)",   rateGroupId: grpAddon.id },
  ];

  const chars = new Map<string, string>();
  for (const ch of charactersData) {
    const created = await prisma.character.create({ data: ch });
    chars.set(ch.name, created.id);
    const prices = defaultPrices[ch.rateGroupId] || {};
    for (const [dur, price] of Object.entries(prices)) {
      await prisma.characterPriceOption.create({
        data: {
          characterId: created.id,
          durationMin: Number(dur),
          price,
        },
      });
    }
  }

  console.log(`   ✓ ${charactersData.length} персонажей с ценами`);

  console.log("🌱 Seed: создаём матрицу ставок (аниматор × группа × длительность)…");

  const matrix: Array<{
    animatorId: string;
    rateGroupId: string;
    durations: Record<number, number>;
  }> = [
    // Аня — опытная, ставки выше
    {
      animatorId: anim1.id,
      rateGroupId: grpSimple.id,
      durations: { 30: 1200, 40: 1400, 45: 1500, 60: 2000, 90: 2800, 120: 3500, 180: 5000 },
    },
    {
      animatorId: anim1.id,
      rateGroupId: grpMascot.id,
      durations: { 30: 1600, 40: 1800, 45: 2000, 60: 2600, 90: 3600, 120: 4500, 180: 6500 },
    },
    {
      animatorId: anim1.id,
      rateGroupId: grpShow.id,
      durations: { 30: 2000, 40: 2400, 45: 2600, 60: 3500, 90: 5000, 120: 6500, 180: 9000 },
    },
    {
      animatorId: anim1.id,
      rateGroupId: grpHost.id,
      durations: { 60: 4000, 90: 5500, 120: 7000, 180: 10000 },
    },
    {
      animatorId: anim1.id,
      rateGroupId: grpPhoto.id,
      durations: { 60: 3500, 90: 5000, 120: 6500, 180: 9000 },
    },
    {
      animatorId: anim1.id,
      rateGroupId: grpAddon.id,
      durations: { 30: 800, 45: 1000, 60: 1200, 90: 1800, 120: 2400 },
    },
    // Пётр — базовые
    {
      animatorId: anim2.id,
      rateGroupId: grpSimple.id,
      durations: { 30: 1000, 40: 1100, 45: 1200, 60: 1600, 90: 2200, 120: 2800, 180: 4000 },
    },
    {
      animatorId: anim2.id,
      rateGroupId: grpMascot.id,
      durations: { 30: 1300, 40: 1500, 45: 1600, 60: 2100, 90: 3000, 120: 3800, 180: 5500 },
    },
    {
      animatorId: anim2.id,
      rateGroupId: grpShow.id,
      durations: { 30: 1700, 40: 2000, 45: 2200, 60: 3000, 90: 4200, 120: 5500, 180: 8000 },
    },
    {
      animatorId: anim2.id,
      rateGroupId: grpHost.id,
      durations: { 60: 3500, 90: 4800, 120: 6000, 180: 8500 },
    },
    {
      animatorId: anim2.id,
      rateGroupId: grpPhoto.id,
      durations: { 60: 3000, 90: 4200, 120: 5500, 180: 7500 },
    },
    {
      animatorId: anim2.id,
      rateGroupId: grpAddon.id,
      durations: { 30: 700, 45: 900, 60: 1100, 90: 1600, 120: 2100 },
    },
  ];

  let rateCount = 0;
  for (const row of matrix) {
    for (const [dur, amount] of Object.entries(row.durations)) {
      await prisma.rate.create({
        data: {
          animatorId: row.animatorId,
          rateGroupId: row.rateGroupId,
          durationMin: Number(dur),
          amount,
        },
      });
      rateCount++;
    }
  }

  console.log(`   ✓ ${rateCount} ставок в матрице`);

  console.log("🌱 Seed: категории расходов…");

  const expenseCategories = [
    { name: "Аренда", sortOrder: 1 },
    { name: "Коммунальные платежи", sortOrder: 2 },
    { name: "Реклама", sortOrder: 3 },
    { name: "Закупки", sortOrder: 4 },
    { name: "Зарплаты", sortOrder: 5 },
    { name: "Прочее", sortOrder: 99 },
  ];
  const cats = new Map<string, string>();
  for (const c of expenseCategories) {
    const created = await prisma.expenseCategory.create({ data: c });
    cats.set(c.name, created.id);
  }
  console.log(`   ✓ ${expenseCategories.length} категорий`);

  console.log("🌱 Seed: настройки агентства…");
  await prisma.appSetting.createMany({
    data: [
      { key: "app.name", value: "Event Agency" },
      { key: "app.timezone", value: "Europe/Moscow" },
      { key: "app.currency", value: "RUB" },
      { key: "app.default_locale", value: "ru" },
    ],
  });
  console.log("   ✓ app_settings");

  // ===== DEMO_ORDERS_MARKER =====
  console.log("🌱 Seed: демо-заказы…");

  const DAY = 24 * 60 * 60 * 1000;
  const day = (offset: number): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };

  // ===== 1. День рождения (завтра, confirmed, Анна accepted, предоплата) =====
  {
    const eventDate = day(1);
    const order = await prisma.order.create({
      data: {
        clientId: client1.id,
        title: "День рождения Маши, 7 лет",
        description: "Пиратская вечеринка, 10 детей",
        eventDate,
        startTime: "15:00",
        endTime: "16:00",
        address: "Москва, ул. Тверская, 10, кв. 25",
        status: OrderStatus.confirmed,
        subtotal: 4500,
        discountPercent: 0,
        discountAmount: 0,
        clientPrice: 4500,
        prepaymentAmount: 2000,
        prepaymentPaidAt: new Date(eventDate.getTime() - 3 * DAY),
        finalPaymentAmount: 2500,
        transportPolicy: TransportPolicy.client_one_way,
        adminId: admin.id,
        createdBy: admin.id,
        comment: "Согласовать реквизит за день",
      },
    });
    const slot = await prisma.orderSlot.create({
      data: {
        orderId: order.id,
        characterId: chars.get("Пират Джек")!,
        rateDurationMinutes: 60,
        clientPrice: 4500,
        isCustomPrice: false,
        characterNameSnapshot: "Пират Джек",
        sortOrder: 0,
      },
    });
    await prisma.orderAnimator.create({
      data: {
        orderId: order.id,
        animatorId: anim1.id,
        slotId: slot.id,
        payout: 2000,
        payoutSource: PayoutSource.rate_matrix,
        status: AssignmentStatus.accepted,
        invitedAt: new Date(eventDate.getTime() - 4 * DAY),
        respondedAt: new Date(eventDate.getTime() - 3 * DAY),
        transportPaidBy: TransportPolicy.client_one_way,
      },
    });
    await prisma.orderPayment.create({
      data: {
        orderId: order.id,
        type: OrderPaymentType.prepayment,
        amount: 2000,
        method: PaymentMethod.transfer,
        paidAt: new Date(eventDate.getTime() - 3 * DAY),
        comment: "Предоплата переводом",
        createdBy: admin.id,
      },
    });
  }

  // ===== 2. Корпоратив (через 7 дней, new, без аниматора) =====
  {
    const eventDate = day(7);
    const order = await prisma.order.create({
      data: {
        clientId: client2.id,
        title: "Корпоратив в офисе",
        eventDate,
        startTime: "18:00",
        endTime: "20:00",
        address: "Москва, ул. Арбат, 5, офис 301",
        status: OrderStatus.new,
        subtotal: 14000,
        discountPercent: 0,
        discountAmount: 0,
        clientPrice: 14000,
        prepaymentAmount: 0,
        finalPaymentAmount: 14000,
        transportPolicy: TransportPolicy.client_both_ways,
        adminId: admin.id,
        createdBy: admin.id,
      },
    });
    await prisma.orderSlot.create({
      data: {
        orderId: order.id,
        characterId: chars.get("Ведущий (стандарт)")!,
        rateDurationMinutes: 120,
        clientPrice: 14000,
        isCustomPrice: false,
        characterNameSnapshot: "Ведущий (стандарт)",
        sortOrder: 0,
      },
    });
  }

  // ===== 3. Свадьба (-3 дня, completed, полная оплата, payout выплачен) =====
  {
    const eventDate = day(-3);
    const order = await prisma.order.create({
      data: {
        clientId: client1.id,
        title: "Свадьба К+А",
        eventDate,
        startTime: "16:00",
        endTime: "18:00",
        address: "Москва, банкетный зал Ривьера",
        status: OrderStatus.completed,
        subtotal: 11000,
        discountPercent: 0,
        discountAmount: 0,
        clientPrice: 11000,
        prepaymentAmount: 5000,
        prepaymentPaidAt: new Date(eventDate.getTime() - 14 * DAY),
        finalPaymentMethod: PaymentMethod.cash,
        finalPaymentAmount: 6000,
        finalPaymentReceivedAt: new Date(eventDate.getTime() + 1 * DAY),
        finalPaymentReceivedBy: director.id,
        finalPaymentHandedAt: new Date(eventDate.getTime() + 2 * DAY),
        finalPaymentHandedBy: director.id,
        transportPolicy: TransportPolicy.agency_pays,
        adminId: admin.id,
        createdBy: admin.id,
      },
    });
    const slot = await prisma.orderSlot.create({
      data: {
        orderId: order.id,
        characterId: chars.get("Фотограф")!,
        rateDurationMinutes: 120,
        clientPrice: 11000,
        isCustomPrice: false,
        characterNameSnapshot: "Фотограф",
        sortOrder: 0,
      },
    });
    await prisma.orderAnimator.create({
      data: {
        orderId: order.id,
        animatorId: anim2.id,
        slotId: slot.id,
        payout: 5500,
        payoutSource: PayoutSource.rate_matrix,
        status: AssignmentStatus.completed,
        invitedAt: new Date(eventDate.getTime() - 20 * DAY),
        respondedAt: new Date(eventDate.getTime() - 19 * DAY),
        completedAt: new Date(eventDate.getTime() + 1 * DAY),
        transportPaidBy: TransportPolicy.agency_pays,
        transportCost: 800,
        transportClientAmount: 0,
        transportLockedAt: new Date(eventDate.getTime() + 1 * DAY),
        payoutPaidAt: new Date(eventDate.getTime() + 3 * DAY),
        payoutPaidBy: director.id,
        payoutMethod: PaymentMethod.transfer,
      },
    });
    await prisma.orderPayment.create({
      data: {
        orderId: order.id,
        type: OrderPaymentType.prepayment,
        amount: 5000,
        method: PaymentMethod.transfer,
        paidAt: new Date(eventDate.getTime() - 14 * DAY),
        createdBy: admin.id,
      },
    });
    await prisma.orderPayment.create({
      data: {
        orderId: order.id,
        type: OrderPaymentType.final,
        amount: 6000,
        method: PaymentMethod.cash,
        paidAt: new Date(eventDate.getTime() + 1 * DAY),
        createdBy: director.id,
      },
    });
    await prisma.adminAccrual.create({
      data: {
        adminId: admin.id,
        orderId: order.id,
        type: AdminCompensationType.percent,
        baseAmount: 11000,
        percentValue: 7,
        amount: 770,
        status: AdminAccrualStatus.active,
      },
    });
  }

  // ===== 4. Утренник (-10 дней, completed, 2 слота, 2 аниматора) =====
  {
    const eventDate = day(-10);
    const order = await prisma.order.create({
      data: {
        clientId: client2.id,
        title: "Утренник в детском саду",
        eventDate,
        startTime: "10:00",
        endTime: "11:30",
        address: "Детский сад №42",
        status: OrderStatus.completed,
        subtotal: 11500,
        discountPercent: 0,
        discountAmount: 0,
        clientPrice: 11500,
        prepaymentAmount: 0,
        finalPaymentMethod: PaymentMethod.transfer,
        finalPaymentAmount: 11500,
        finalPaymentReceivedAt: new Date(eventDate.getTime() + 1 * DAY),
        finalPaymentReceivedBy: director.id,
        finalPaymentHandedAt: new Date(eventDate.getTime() + 1 * DAY),
        finalPaymentHandedBy: director.id,
        transportPolicy: TransportPolicy.client_one_way,
        adminId: admin.id,
        createdBy: admin.id,
      },
    });
    const slot1 = await prisma.orderSlot.create({
      data: {
        orderId: order.id,
        characterId: chars.get("Микки Маус")!,
        rateDurationMinutes: 60,
        clientPrice: 5500,
        isCustomPrice: false,
        characterNameSnapshot: "Микки Маус",
        sortOrder: 0,
      },
    });
    const slot2 = await prisma.orderSlot.create({
      data: {
        orderId: order.id,
        characterId: chars.get("Аквагрим")!,
        rateDurationMinutes: 90,
        clientPrice: 6000,
        isCustomPrice: false,
        characterNameSnapshot: "Аквагрим",
        sortOrder: 1,
      },
    });
    await prisma.orderAnimator.create({
      data: {
        orderId: order.id,
        animatorId: anim2.id,
        slotId: slot1.id,
        payout: 2100,
        payoutSource: PayoutSource.rate_matrix,
        status: AssignmentStatus.completed,
        invitedAt: new Date(eventDate.getTime() - 7 * DAY),
        respondedAt: new Date(eventDate.getTime() - 6 * DAY),
        completedAt: new Date(eventDate.getTime() + 1 * DAY),
        transportPaidBy: TransportPolicy.client_one_way,
        transportCost: 400,
        transportClientAmount: 0,
        payoutPaidAt: new Date(eventDate.getTime() + 2 * DAY),
        payoutPaidBy: director.id,
        payoutMethod: PaymentMethod.cash,
      },
    });
    await prisma.orderAnimator.create({
      data: {
        orderId: order.id,
        animatorId: anim1.id,
        slotId: slot2.id,
        payout: 1600,
        payoutSource: PayoutSource.rate_matrix,
        status: AssignmentStatus.completed,
        invitedAt: new Date(eventDate.getTime() - 7 * DAY),
        respondedAt: new Date(eventDate.getTime() - 6 * DAY),
        completedAt: new Date(eventDate.getTime() + 1 * DAY),
        transportPaidBy: TransportPolicy.client_one_way,
        transportCost: 400,
        transportClientAmount: 0,
        payoutPaidAt: new Date(eventDate.getTime() + 2 * DAY),
        payoutPaidBy: director.id,
        payoutMethod: PaymentMethod.cash,
      },
    });
    await prisma.orderPayment.create({
      data: {
        orderId: order.id,
        type: OrderPaymentType.final,
        amount: 11500,
        method: PaymentMethod.transfer,
        paidAt: new Date(eventDate.getTime() + 1 * DAY),
        createdBy: director.id,
      },
    });
    await prisma.adminAccrual.create({
      data: {
        adminId: admin.id,
        orderId: order.id,
        type: AdminCompensationType.percent,
        baseAmount: 11500,
        percentValue: 7,
        amount: 805,
        status: AdminAccrualStatus.active,
      },
    });
  }

  // ===== 5. Отменённый заказ (+5 дней, cancelled) =====
  {
    const eventDate = day(5);
    await prisma.order.create({
      data: {
        clientId: client1.id,
        title: "Отменённый заказ",
        eventDate,
        startTime: "12:00",
        endTime: "13:00",
        address: "Москва",
        status: OrderStatus.cancelled,
        subtotal: 0,
        discountPercent: 0,
        discountAmount: 0,
        clientPrice: 0,
        prepaymentAmount: 0,
        finalPaymentAmount: 0,
        transportPolicy: TransportPolicy.client_one_way,
        adminId: admin.id,
        createdBy: admin.id,
        comment: "Клиент отменил",
      },
    });
  }

  // ===== Расходы =====
  await prisma.expense.create({
    data: {
      categoryId: cats.get("Реклама")!,
      amount: 5000,
      expenseDate: day(-5),
      comment: "Реклама в соцсетях",
      createdBy: director.id,
    },
  });
  await prisma.expense.create({
    data: {
      categoryId: cats.get("Закупки")!,
      amount: 1500,
      expenseDate: day(-2),
      comment: "Реквизит для Пирата Джека",
      createdBy: director.id,
    },
  });

  console.log("🌱 Seed: выплата админу (аванс 500 ₽)…");
  const salaryExpense = await prisma.expense.create({
    data: {
      categoryId: cats.get("Зарплаты")!,
      amount: 500,
      expenseDate: day(-1),
      comment: "Выплата админу Петрова Ольга — аванс",
      createdBy: director.id,
    },
  });
  await prisma.adminPayment.create({
    data: {
      adminId: admin.id,
      amount: 500,
      method: PaymentMethod.transfer,
      paidAt: day(-1),
      comment: "Аванс за первую половину месяца",
      expenseId: salaryExpense.id,
      createdBy: director.id,
    },
  });

  console.log("   ✓ 5 демо-заказов + 2 расхода + 1 аванс админу");

  console.log("\n✅ Seed завершён.\n");
  console.log("Учётные записи:");
  console.log("  👔 Директор: +79001234567 / superpassword123");
  console.log("  🧑‍💼 Админ:    +79002223344 / adminpass123");
  console.log("  🎭 Аниматор: +79007778899 / animpass123  (Анна)");
  console.log("  🎭 Аниматор: +79005556677 / animpass123  (Пётр)");
  console.log("");
  console.log("Демо-заказы:");
  console.log("  🎂 День рождения Маши      +1 день  (confirmed, Анна accepted)");
  console.log("  🏢 Корпоратив              +7 дней  (new, без аниматора)");
  console.log("  💍 Свадьба                 −3 дня   (completed, оплачен полностью)");
  console.log("  🎄 Утренник                −10 дней (completed, 2 слота)");
  console.log("  ❌ Отменённый заказ        +5 дней  (cancelled)");
  console.log("");
  console.log("Оплата админа (Ольга Петрова):");
  console.log("  💼 Ставка:              7% от заказов");
  console.log("  📈 Начислено:           1575 ₽ (Свадьба 770 + Утренник 805)");
  console.log("  💸 Выплачено (аванс):   500 ₽");
  console.log("  💵 К выплате:           1075 ₽");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });