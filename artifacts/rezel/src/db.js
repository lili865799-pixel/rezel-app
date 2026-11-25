import { openDB } from 'idb';

const DATABASE_NAME = 'rezel-local';
const DATABASE_VERSION = 4;
const SETTINGS_STORE = 'settings';
const CUSTOMERS_STORE = 'customers';
const SERVICES_STORE = 'services';
const APPOINTMENTS_STORE = 'appointments';
const PAYMENTS_STORE = 'payments';
const EXPENSES_STORE = 'expenses';
const ORDERS_STORE = 'orders';
const BUSINESS_TYPE_KEY = 'businessType';
const BACKUP_FORMAT = 'rezel-backup';
const BACKUP_VERSION = 1;
const BACKUP_STORE_NAMES = [
  SETTINGS_STORE,
  CUSTOMERS_STORE,
  SERVICES_STORE,
  APPOINTMENTS_STORE,
  PAYMENTS_STORE,
  EXPENSES_STORE,
  ORDERS_STORE,
];

let databasePromise;

function getDatabase() {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }

  if (!databasePromise) {
    databasePromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE);
        }
        if (!database.objectStoreNames.contains(CUSTOMERS_STORE)) {
          database.createObjectStore(CUSTOMERS_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(SERVICES_STORE)) {
          database.createObjectStore(SERVICES_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(APPOINTMENTS_STORE)) {
          database.createObjectStore(APPOINTMENTS_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(PAYMENTS_STORE)) {
          database.createObjectStore(PAYMENTS_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(EXPENSES_STORE)) {
          database.createObjectStore(EXPENSES_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(ORDERS_STORE)) {
          database.createObjectStore(ORDERS_STORE, { keyPath: 'id' });
        }
      },
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

export async function saveBusinessType(businessType) {
  if (typeof businessType !== 'string' || businessType.trim().length === 0) {
    throw new TypeError('Business type must be a non-empty string.');
  }

  const database = await getDatabase();
  await database.put(SETTINGS_STORE, businessType.trim(), BUSINESS_TYPE_KEY);
}

export async function getBusinessType() {
  const database = await getDatabase();
  return (await database.get(SETTINGS_STORE, BUSINESS_TYPE_KEY)) ?? null;
}

function createRecordId() {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('Secure ID generation is not available in this browser.');
  }

  return crypto.randomUUID();
}

function requireText(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function getActiveRecords(storeName) {
  const database = await getDatabase();
  const records = await database.getAll(storeName);

  return records
    .filter((record) => !record.deletedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function softDeleteRecord(storeName, id) {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('A record ID is required.');
  }

  const database = await getDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);
  const record = await store.get(id);

  if (!record || record.deletedAt) {
    await transaction.done;
    return false;
  }

  await store.put({ ...record, deletedAt: new Date().toISOString() });
  await transaction.done;
  return true;
}

export async function addCustomer({ name, phone, notes = '' }) {
  const customer = {
    id: createRecordId(),
    name: requireText(name, 'Customer name'),
    phone: requireText(phone, 'Customer phone'),
    notes: optionalText(notes),
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };

  const database = await getDatabase();
  await database.add(CUSTOMERS_STORE, customer);
  return customer;
}

export async function getAllCustomers() {
  return getActiveRecords(CUSTOMERS_STORE);
}

export async function softDeleteCustomer(id) {
  return softDeleteRecord(CUSTOMERS_STORE, id);
}

export async function updateCustomer(id, { name, phone, notes = '' }) {
  const recordId = requireText(id, 'Customer ID');
  const updatedFields = {
    name: requireText(name, 'Customer name'),
    phone: requireText(phone, 'Customer phone'),
    notes: optionalText(notes),
  };
  const database = await getDatabase();
  const transaction = database.transaction(CUSTOMERS_STORE, 'readwrite');
  const store = transaction.objectStore(CUSTOMERS_STORE);
  const customer = await store.get(recordId);

  if (!customer || customer.deletedAt) {
    await transaction.done;
    throw new Error('The customer is no longer available.');
  }

  const updatedCustomer = { ...customer, ...updatedFields };
  await store.put(updatedCustomer);
  await transaction.done;
  return updatedCustomer;
}

export async function addService({
  name,
  price,
  duration = null,
  notes = '',
}) {
  const parsedPrice = Number(price);
  if (
    price === null ||
    price === undefined ||
    price === '' ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0
  ) {
    throw new TypeError('Service price must be a non-negative number.');
  }

  let parsedDuration = null;
  if (duration !== null && duration !== undefined && duration !== '') {
    parsedDuration = Number(duration);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
      throw new TypeError('Service duration must be a non-negative number.');
    }
  }

  const service = {
    id: createRecordId(),
    name: requireText(name, 'Service name'),
    price: parsedPrice,
    duration: parsedDuration,
    notes: optionalText(notes),
    createdAt: new Date().toISOString(),
    deletedAt: null,
  };

  const database = await getDatabase();
  await database.add(SERVICES_STORE, service);
  return service;
}

export async function getAllServices() {
  return getActiveRecords(SERVICES_STORE);
}

export async function softDeleteService(id) {
  return softDeleteRecord(SERVICES_STORE, id);
}

export async function updateService(id, { name, price, duration = null, notes = '' }) {
  const recordId = requireText(id, 'Service ID');
  const parsedPrice = Number(price);
  if (price === null || price === undefined || price === '' || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw new TypeError('Service price must be a non-negative number.');
  }

  let parsedDuration = null;
  if (duration !== null && duration !== undefined && duration !== '') {
    parsedDuration = Number(duration);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 0) {
      throw new TypeError('Service duration must be a non-negative number.');
    }
  }

  const database = await getDatabase();
  const transaction = database.transaction(SERVICES_STORE, 'readwrite');
  const store = transaction.objectStore(SERVICES_STORE);
  const service = await store.get(recordId);
  if (!service || service.deletedAt) {
    await transaction.done;
    throw new Error('The service is no longer available.');
  }

  const updatedService = {
    ...service,
    name: requireText(name, 'Service name'),
    price: parsedPrice,
    duration: parsedDuration,
    notes: optionalText(notes),
  };
  await store.put(updatedService);
  await transaction.done;
  return updatedService;
}

function requireDate(value, fieldName = 'Date') {
  const date = requireText(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError(`${fieldName} must use YYYY-MM-DD format.`);
  }

  const [year, month, day] = date.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new TypeError(`${fieldName} is invalid.`);
  }

  return date;
}

function requireTime(value) {
  const time = requireText(value, 'Appointment time');
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new TypeError('Appointment time must use HH:MM format.');
  }

  return time;
}

export async function getAllAppointments() {
  const database = await getDatabase();
  const appointments = await database.getAll(APPOINTMENTS_STORE);

  return appointments.sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
  );
}

export async function getAllPayments() {
  const database = await getDatabase();
  const payments = await database.getAll(PAYMENTS_STORE);

  return payments.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addAppointmentWithDeposit({
  customerId,
  serviceId,
  date,
  time,
  depositAmount,
  notes = '',
}) {
  const selectedCustomerId = requireText(customerId, 'Customer');
  const selectedServiceId = requireText(serviceId, 'Service');
  const appointmentDate = requireDate(date, 'Appointment date');
  const appointmentTime = requireTime(time);
  const deposit = Number(depositAmount);

  if (
    depositAmount === null ||
    depositAmount === undefined ||
    depositAmount === '' ||
    !Number.isFinite(deposit) ||
    deposit < 0
  ) {
    throw new TypeError('Deposit must be a non-negative number.');
  }

  const database = await getDatabase();
  const transaction = database.transaction(
    [CUSTOMERS_STORE, SERVICES_STORE, APPOINTMENTS_STORE, PAYMENTS_STORE],
    'readwrite',
  );
  const transactionDone = transaction.done;

  try {
    const [customer, service] = await Promise.all([
      transaction.objectStore(CUSTOMERS_STORE).get(selectedCustomerId),
      transaction.objectStore(SERVICES_STORE).get(selectedServiceId),
    ]);

    if (!customer || customer.deletedAt) {
      throw new Error('The selected customer is no longer available.');
    }
    if (!service || service.deletedAt) {
      throw new Error('The selected service is no longer available.');
    }

    const price = Number(service.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('The selected service has an invalid price.');
    }
    if (deposit > price) {
      throw new RangeError('Deposit cannot be greater than the service price.');
    }

    const appointmentId = createRecordId();
    const appointment = {
      id: appointmentId,
      customerId: selectedCustomerId,
      serviceId: selectedServiceId,
      date: appointmentDate,
      time: appointmentTime,
      price,
      status: 'scheduled',
      notes: optionalText(notes),
      createdAt: new Date().toISOString(),
    };
    const payment = {
      id: createRecordId(),
      appointmentId,
      customerId: selectedCustomerId,
      amount: deposit,
      type: 'deposit',
      date: new Date().toISOString(),
      notes: 'عربون موعد',
    };

    await Promise.all([
      transaction.objectStore(APPOINTMENTS_STORE).add(appointment),
      transaction.objectStore(PAYMENTS_STORE).add(payment),
    ]);
    await transactionDone;
    return { appointment, payment };
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transactionDone;
    } catch {
      // Consume the aborted transaction rejection before reporting the cause.
    }
    throw error;
  }
}

export async function updateAppointment(id, {
  customerId,
  serviceId,
  date,
  time,
  notes = '',
}) {
  const recordId = requireText(id, 'Appointment ID');
  const selectedCustomerId = requireText(customerId, 'Customer');
  const selectedServiceId = requireText(serviceId, 'Service');
  const appointmentDate = requireDate(date, 'Appointment date');
  const appointmentTime = requireTime(time);
  const database = await getDatabase();
  const transaction = database.transaction(
    [CUSTOMERS_STORE, SERVICES_STORE, APPOINTMENTS_STORE, PAYMENTS_STORE],
    'readwrite',
  );
  const transactionDone = transaction.done;

  try {
    const [customer, service, appointment, payments] = await Promise.all([
      transaction.objectStore(CUSTOMERS_STORE).get(selectedCustomerId),
      transaction.objectStore(SERVICES_STORE).get(selectedServiceId),
      transaction.objectStore(APPOINTMENTS_STORE).get(recordId),
      transaction.objectStore(PAYMENTS_STORE).getAll(),
    ]);
    if (!customer || customer.deletedAt) {
      throw new Error('The selected customer is no longer available.');
    }
    if (!service || service.deletedAt) {
      throw new Error('The selected service is no longer available.');
    }
    if (!appointment || isRecordDeleted(appointment)) {
      throw new Error('The appointment is no longer available.');
    }

    const price = Number(service.price);
    const alreadyPaidCents = payments
      .filter((payment) => payment.appointmentId === recordId)
      .reduce((total, payment) => total + storedCents(payment.amount), 0);
    if (!Number.isFinite(price) || Math.round(price * 100) < alreadyPaidCents) {
      throw new RangeError('The service price cannot be lower than the amount already paid.');
    }

    const updatedAppointment = {
      ...appointment,
      customerId: selectedCustomerId,
      serviceId: selectedServiceId,
      date: appointmentDate,
      time: appointmentTime,
      price,
      notes: optionalText(notes),
    };
    await transaction.objectStore(APPOINTMENTS_STORE).put(updatedAppointment);
    await transactionDone;
    return updatedAppointment;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transactionDone;
    } catch {
      // Consume the aborted transaction rejection before reporting the cause.
    }
    throw error;
  }
}

function isRecordDeleted(record) {
  return Boolean(record.deletedAt);
}

function safeStoredAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? Math.round(amount * 100) / 100
    : 0;
}

function storedCents(value) {
  return Math.round(safeStoredAmount(value) * 100);
}

export async function getAllExpenses() {
  const database = await getDatabase();
  const expenses = await database.getAll(EXPENSES_STORE);

  return expenses.sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function addExpense({ amount, category, date, notes = '' }) {
  const parsedAmount = Number(amount);
  if (
    amount === null ||
    amount === undefined ||
    amount === '' ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0
  ) {
    throw new TypeError('Expense amount must be a positive number.');
  }

  const expense = {
    id: createRecordId(),
    amount: parsedAmount,
    category: requireText(category, 'Expense category'),
    date: requireDate(date, 'Expense date'),
    notes: optionalText(notes),
    createdAt: new Date().toISOString(),
  };

  const database = await getDatabase();
  await database.add(EXPENSES_STORE, expense);
  return expense;
}

const ORDER_STATUSES = new Set(['new', 'in_progress', 'ready', 'delivered']);

export async function getAllOrders() {
  const database = await getDatabase();
  const orders = await database.getAll(ORDERS_STORE);

  return orders.sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt),
  );
}

export async function addOrder({
  customerId,
  description,
  price,
  deposit,
  dueDate,
  status = 'new',
  notes = '',
}) {
  const selectedCustomerId = requireText(customerId, 'Customer');
  const orderDescription = requireText(description, 'Order description');
  const parsedPrice = Number(price);
  const parsedDeposit = Number(deposit);
  const orderDueDate = requireDate(dueDate, 'Order due date');

  if (
    price === null ||
    price === undefined ||
    price === '' ||
    !Number.isFinite(parsedPrice) ||
    parsedPrice <= 0
  ) {
    throw new TypeError('Order price must be a positive number.');
  }
  if (
    deposit === null ||
    deposit === undefined ||
    deposit === '' ||
    !Number.isFinite(parsedDeposit) ||
    parsedDeposit < 0 ||
    parsedDeposit > parsedPrice
  ) {
    throw new TypeError('Order deposit must be between zero and the order price.');
  }
  if (!ORDER_STATUSES.has(status)) {
    throw new TypeError('Order status is invalid.');
  }

  const order = {
    id: createRecordId(),
    customerId: selectedCustomerId,
    description: orderDescription,
    price: parsedPrice,
    deposit: parsedDeposit,
    dueDate: orderDueDate,
    status,
    notes: optionalText(notes),
    createdAt: new Date().toISOString(),
  };

  const database = await getDatabase();
  const transaction = database.transaction(
    [CUSTOMERS_STORE, ORDERS_STORE],
    'readwrite',
  );
  const transactionDone = transaction.done;

  try {
    const customer = await transaction.objectStore(CUSTOMERS_STORE).get(selectedCustomerId);
    if (!customer || customer.deletedAt) {
      throw new Error('The selected customer is no longer available.');
    }

    await transaction.objectStore(ORDERS_STORE).add(order);
    await transactionDone;
    return order;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transactionDone;
    } catch {
      // Consume the aborted transaction rejection before reporting the cause.
    }
    throw error;
  }
}

export async function updateOrder(id, {
  customerId,
  description,
  price,
  deposit,
  dueDate,
  status = 'new',
  notes = '',
}) {
  const recordId = requireText(id, 'Order ID');
  const selectedCustomerId = requireText(customerId, 'Customer');
  const orderDescription = requireText(description, 'Order description');
  const parsedPrice = Number(price);
  const parsedDeposit = Number(deposit);
  const orderDueDate = requireDate(dueDate, 'Order due date');

  if (price === null || price === undefined || price === '' || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw new TypeError('Order price must be a positive number.');
  }
  if (deposit === null || deposit === undefined || deposit === '' || !Number.isFinite(parsedDeposit) || parsedDeposit < 0 || parsedDeposit > parsedPrice) {
    throw new TypeError('Order deposit must be between zero and the order price.');
  }
  if (!ORDER_STATUSES.has(status)) {
    throw new TypeError('Order status is invalid.');
  }

  const database = await getDatabase();
  const transaction = database.transaction(
    [CUSTOMERS_STORE, ORDERS_STORE, PAYMENTS_STORE],
    'readwrite',
  );
  const transactionDone = transaction.done;

  try {
    const [customer, order, payments] = await Promise.all([
      transaction.objectStore(CUSTOMERS_STORE).get(selectedCustomerId),
      transaction.objectStore(ORDERS_STORE).get(recordId),
      transaction.objectStore(PAYMENTS_STORE).getAll(),
    ]);
    if (!customer || customer.deletedAt) {
      throw new Error('The selected customer is no longer available.');
    }
    if (!order) {
      throw new Error('The order is no longer available.');
    }
    const additionalPaidCents = payments
      .filter((payment) => payment.orderId === recordId)
      .reduce((total, payment) => total + storedCents(payment.amount), 0);
    if (Math.round(parsedDeposit * 100) + additionalPaidCents > Math.round(parsedPrice * 100)) {
      throw new RangeError('Price cannot be lower than the deposit and payments already recorded.');
    }

    const updatedOrder = {
      ...order,
      customerId: selectedCustomerId,
      description: orderDescription,
      price: parsedPrice,
      deposit: parsedDeposit,
      dueDate: orderDueDate,
      status,
      notes: optionalText(notes),
    };
    await transaction.objectStore(ORDERS_STORE).put(updatedOrder);
    await transactionDone;
    return updatedOrder;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transactionDone;
    } catch {
      // Consume the aborted transaction rejection before reporting the cause.
    }
    throw error;
  }
}

function requirePaymentDate(value) {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString();
  }
  return requireDate(value, 'Payment date');
}

export async function addPayment({
  appointmentId,
  orderId,
  amount,
  date,
  notes = '',
}) {
  const hasAppointment = typeof appointmentId === 'string' && appointmentId.trim().length > 0;
  const hasOrder = typeof orderId === 'string' && orderId.trim().length > 0;
  if (hasAppointment === hasOrder) {
    throw new TypeError('A payment must belong to exactly one appointment or order.');
  }
  const relatedId = requireText(hasAppointment ? appointmentId : orderId, 'Record ID');
  const parsedAmount = Number(amount);
  if (amount === null || amount === undefined || amount === '' || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new TypeError('Payment amount must be a positive number.');
  }
  const paymentAmount = Math.round(parsedAmount * 100) / 100;
  const paymentDate = requirePaymentDate(date);
  const database = await getDatabase();
  const entityStoreName = hasAppointment ? APPOINTMENTS_STORE : ORDERS_STORE;
  const transaction = database.transaction(
    [entityStoreName, PAYMENTS_STORE],
    'readwrite',
  );
  const transactionDone = transaction.done;

  try {
    const entityStore = transaction.objectStore(entityStoreName);
    const paymentStore = transaction.objectStore(PAYMENTS_STORE);
    const [entity, payments] = await Promise.all([
      entityStore.get(relatedId),
      paymentStore.getAll(),
    ]);
    if (!entity || entity.deletedAt) {
      throw new Error('The appointment or order is no longer available.');
    }
    if (hasAppointment && ['cancelled', 'canceled', 'ملغي'].includes(String(entity.status || '').toLowerCase())) {
      throw new Error('Payments cannot be added to a cancelled appointment.');
    }

    const linkedPayments = payments.filter((payment) => (
      hasAppointment
        ? payment.appointmentId === relatedId
        : payment.orderId === relatedId
    ));
    const amountAlreadyPaidCents = linkedPayments.reduce(
      (total, payment) => total + storedCents(payment.amount),
      hasOrder ? storedCents(entity.deposit) : 0,
    );
    const remainingCents = Math.max(storedCents(entity.price) - amountAlreadyPaidCents, 0);
    if (paymentAmount <= 0 || Math.round(paymentAmount * 100) > remainingCents) {
      throw new RangeError('Payment cannot be greater than the remaining balance.');
    }

    const payment = {
      id: createRecordId(),
      ...(hasAppointment ? { appointmentId: relatedId } : { orderId: relatedId }),
      customerId: entity.customerId,
      amount: paymentAmount,
      type: hasAppointment ? 'appointment_payment' : 'order_payment',
      date: paymentDate,
      notes: optionalText(notes),
      createdAt: new Date().toISOString(),
    };
    await paymentStore.add(payment);
    await transactionDone;
    return payment;
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transactionDone;
    } catch {
      // Consume the aborted transaction rejection before reporting the cause.
    }
    throw error;
  }
}

function invalidBackup(message) {
  throw new TypeError(message);
}

function backupText(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    invalidBackup(`حقل «${label}» مفقود أو غير صالح.`);
  }
  return value.trim();
}

function backupOptionalText(value, label) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    invalidBackup(`حقل «${label}» يجب أن يكون نصاً.`);
  }
  return value;
}

function backupNumber(value, label, { allowZero = true } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    invalidBackup(`قيمة «${label}» غير صالحة.`);
  }
  return value;
}

function backupTimestamp(value, label) {
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    invalidBackup(`تاريخ «${label}» غير صالح.`);
  }
  return value;
}

function backupDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalidBackup(`تاريخ «${label}» غير صالح.`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const checked = new Date(Date.UTC(year, month - 1, day));
  if (
    checked.getUTCFullYear() !== year ||
    checked.getUTCMonth() !== month - 1 ||
    checked.getUTCDate() !== day
  ) {
    invalidBackup(`تاريخ «${label}» غير صالح.`);
  }
  return value;
}

function backupObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalidBackup(`بيانات «${label}» غير صالحة.`);
  }
  return value;
}

function backupArray(value, label) {
  if (!Array.isArray(value)) {
    invalidBackup(`قائمة «${label}» مفقودة أو غير صالحة.`);
  }
  return value;
}

function validateRecordIds(records, storeName) {
  const ids = new Set();
  return records.map((record) => {
    const item = backupObject(record, storeName);
    const id = backupText(item.id, `${storeName}.id`);
    if (ids.has(id)) {
      invalidBackup(`تحتوي قائمة «${storeName}» على معرّف مكرر.`);
    }
    ids.add(id);
    return { ...item, id };
  });
}

function validateBackupStores(backup) {
  const source = backupObject(backup.stores, 'المتاجر');
  const stores = {};
  BACKUP_STORE_NAMES.forEach((storeName) => {
    if (!Object.prototype.hasOwnProperty.call(source, storeName)) {
      invalidBackup(`النسخة لا تحتوي على بيانات «${storeName}».`);
    }
  });

  const settingsEntries = backupArray(source[SETTINGS_STORE], 'الإعدادات').map((entry) => {
    const item = backupObject(entry, 'الإعدادات');
    return {
      key: backupText(item.key, 'مفتاح الإعداد'),
      value: item.value,
    };
  });
  const settingKeys = new Set();
  settingsEntries.forEach(({ key }) => {
    if (settingKeys.has(key)) invalidBackup('يوجد مفتاح إعداد مكرر.');
    settingKeys.add(key);
  });
  const businessType = settingsEntries.find((entry) => entry.key === BUSINESS_TYPE_KEY)?.value;
  if (typeof businessType !== 'string' || !businessType.trim()) {
    invalidBackup('النسخة لا تحتوي على نوع النشاط المحفوظ.');
  }
  stores[SETTINGS_STORE] = settingsEntries;

  stores[CUSTOMERS_STORE] = validateRecordIds(
    backupArray(source[CUSTOMERS_STORE], 'العملاء'),
    CUSTOMERS_STORE,
  ).map((item) => {
    const deletedAt = item.deletedAt ?? null;
    if (deletedAt !== null) backupTimestamp(deletedAt, 'deletedAt');
    return {
      ...item,
      name: backupText(item.name, 'اسم العميل'),
      phone: backupText(item.phone, 'هاتف العميل'),
      notes: backupOptionalText(item.notes, 'ملاحظات العميل'),
      createdAt: backupTimestamp(item.createdAt, 'createdAt للعميل'),
      deletedAt,
    };
  });
  const customerIds = new Set(stores[CUSTOMERS_STORE].map((item) => item.id));

  stores[SERVICES_STORE] = validateRecordIds(
    backupArray(source[SERVICES_STORE], 'الخدمات'),
    SERVICES_STORE,
  ).map((item) => {
    const deletedAt = item.deletedAt ?? null;
    if (deletedAt !== null) backupTimestamp(deletedAt, 'deletedAt');
    const duration = item.duration ?? null;
    if (duration !== null) backupNumber(duration, 'مدة الخدمة');
    return {
      ...item,
      name: backupText(item.name, 'اسم الخدمة'),
      price: backupNumber(item.price, 'سعر الخدمة'),
      duration,
      notes: backupOptionalText(item.notes, 'ملاحظات الخدمة'),
      createdAt: backupTimestamp(item.createdAt, 'createdAt للخدمة'),
      deletedAt,
    };
  });
  const serviceIds = new Set(stores[SERVICES_STORE].map((item) => item.id));

  stores[APPOINTMENTS_STORE] = validateRecordIds(
    backupArray(source[APPOINTMENTS_STORE], 'المواعيد'),
    APPOINTMENTS_STORE,
  ).map((item) => {
    const customerId = backupText(item.customerId, 'عميل الموعد');
    const serviceId = backupText(item.serviceId, 'خدمة الموعد');
    if (!customerIds.has(customerId) || !serviceIds.has(serviceId)) {
      invalidBackup('يوجد موعد مرتبط بعميل أو خدمة غير موجودة.');
    }
    const time = backupText(item.time, 'وقت الموعد');
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      invalidBackup('يوجد وقت موعد غير صالح.');
    }
    return {
      ...item,
      customerId,
      serviceId,
      date: backupDate(item.date, 'الموعد'),
      time,
      price: backupNumber(item.price, 'سعر الموعد'),
      status: backupText(item.status, 'حالة الموعد'),
      notes: backupOptionalText(item.notes, 'ملاحظات الموعد'),
      createdAt: backupTimestamp(item.createdAt, 'createdAt للموعد'),
    };
  });
  const appointmentIds = new Set(stores[APPOINTMENTS_STORE].map((item) => item.id));

  stores[ORDERS_STORE] = validateRecordIds(
    backupArray(source[ORDERS_STORE], 'الطلبات'),
    ORDERS_STORE,
  ).map((item) => {
    const customerId = backupText(item.customerId, 'عميل الطلب');
    if (!customerIds.has(customerId)) invalidBackup('يوجد طلب مرتبط بعميل غير موجود.');
    const price = backupNumber(item.price, 'سعر الطلب', { allowZero: false });
    const deposit = backupNumber(item.deposit, 'عربون الطلب');
    if (deposit > price) invalidBackup('عربون أحد الطلبات أكبر من سعره.');
    if (!ORDER_STATUSES.has(item.status)) invalidBackup('تحتوي النسخة على حالة طلب غير مدعومة.');
    return {
      ...item,
      customerId,
      description: backupText(item.description, 'وصف الطلب'),
      price,
      deposit,
      dueDate: backupDate(item.dueDate, 'موعد تسليم الطلب'),
      status: item.status,
      notes: backupOptionalText(item.notes, 'ملاحظات الطلب'),
      createdAt: backupTimestamp(item.createdAt, 'createdAt للطلب'),
    };
  });
  const orderIds = new Set(stores[ORDERS_STORE].map((item) => item.id));

  stores[PAYMENTS_STORE] = validateRecordIds(
    backupArray(source[PAYMENTS_STORE], 'الدفعات'),
    PAYMENTS_STORE,
  ).map((item) => {
    const hasAppointment = typeof item.appointmentId === 'string' && item.appointmentId.length > 0;
    const hasOrder = typeof item.orderId === 'string' && item.orderId.length > 0;
    if (hasAppointment === hasOrder) {
      invalidBackup('يجب ربط كل دفعة بموعد واحد أو طلب واحد فقط.');
    }
    if (hasAppointment && !appointmentIds.has(item.appointmentId)) {
      invalidBackup('توجد دفعة مرتبطة بموعد غير موجود.');
    }
    if (hasOrder && !orderIds.has(item.orderId)) {
      invalidBackup('توجد دفعة مرتبطة بطلب غير موجود.');
    }
    const customerId = backupText(item.customerId, 'عميل الدفعة');
    if (!customerIds.has(customerId)) invalidBackup('توجد دفعة مرتبطة بعميل غير موجود.');
    const date = backupText(item.date, 'تاريخ الدفعة');
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? !isValidBackupDate(date)
        : Number.isNaN(Date.parse(date))
    ) {
      invalidBackup('تاريخ إحدى الدفعات غير صالح.');
    }
    return {
      ...item,
      ...(hasAppointment ? { appointmentId: item.appointmentId } : { orderId: item.orderId }),
      customerId,
      amount: backupNumber(item.amount, 'مبلغ الدفعة'),
      type: backupText(item.type, 'نوع الدفعة'),
      date,
      notes: backupOptionalText(item.notes, 'ملاحظات الدفعة'),
      ...(item.createdAt === undefined ? {} : { createdAt: backupTimestamp(item.createdAt, 'createdAt للدفعة') }),
    };
  });

  stores[EXPENSES_STORE] = validateRecordIds(
    backupArray(source[EXPENSES_STORE], 'المصروفات'),
    EXPENSES_STORE,
  ).map((item) => ({
    ...item,
    amount: backupNumber(item.amount, 'مبلغ المصروف', { allowZero: false }),
    category: backupText(item.category, 'تصنيف المصروف'),
    date: backupDate(item.date, 'المصروف'),
    notes: backupOptionalText(item.notes, 'ملاحظات المصروف'),
    createdAt: backupTimestamp(item.createdAt, 'createdAt للمصروف'),
  }));

  return stores;
}

function isValidBackupDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const checked = new Date(Date.UTC(year, month - 1, day));
  return checked.getUTCFullYear() === year
    && checked.getUTCMonth() === month - 1
    && checked.getUTCDate() === day;
}

export function validateBackup(backup) {
  const source = backupObject(backup, 'النسخة الاحتياطية');
  if (source.format !== BACKUP_FORMAT) {
    invalidBackup('هذا الملف ليس نسخة احتياطية صالحة من REZEL.');
  }
  if (source.version !== BACKUP_VERSION) {
    invalidBackup('إصدار هذه النسخة الاحتياطية غير مدعوم.');
  }
  backupTimestamp(source.exportedAt, 'تاريخ إنشاء النسخة');

  const stores = validateBackupStores(source);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: source.exportedAt,
    stores,
  };
}

export async function createBackup() {
  const database = await getDatabase();
  const transaction = database.transaction(BACKUP_STORE_NAMES, 'readonly');
  const transactionDone = transaction.done;

  try {
    const settingsStore = transaction.objectStore(SETTINGS_STORE);
    const [
      settingKeys,
      settingValues,
      customers,
      services,
      appointments,
      payments,
      expenses,
      orders,
    ] = await Promise.all([
      settingsStore.getAllKeys(),
      settingsStore.getAll(),
      transaction.objectStore(CUSTOMERS_STORE).getAll(),
      transaction.objectStore(SERVICES_STORE).getAll(),
      transaction.objectStore(APPOINTMENTS_STORE).getAll(),
      transaction.objectStore(PAYMENTS_STORE).getAll(),
      transaction.objectStore(EXPENSES_STORE).getAll(),
      transaction.objectStore(ORDERS_STORE).getAll(),
    ]);
    await transactionDone;

    const settings = settingKeys.map((key, index) => {
      if (typeof key !== 'string') {
        throw new TypeError('لا يمكن تصدير مفتاح إعداد غير نصي.');
      }
      return { key, value: settingValues[index] };
    });
    return validateBackup({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      stores: {
        [SETTINGS_STORE]: settings,
        [CUSTOMERS_STORE]: customers,
        [SERVICES_STORE]: services,
        [APPOINTMENTS_STORE]: appointments,
        [PAYMENTS_STORE]: payments,
        [EXPENSES_STORE]: expenses,
        [ORDERS_STORE]: orders,
      },
    });
  } catch (error) {
    try {
      await transactionDone;
    } catch {
      // Consume transaction failures before returning the original error.
    }
    throw error;
  }
}

export async function restoreBackup(backup) {
  const validated = validateBackup(backup);
  const database = await getDatabase();
  const transaction = database.transaction(BACKUP_STORE_NAMES, 'readwrite');
  const transactionDone = transaction.done;

  try {
    const clearRequests = BACKUP_STORE_NAMES.map((storeName) => (
      transaction.objectStore(storeName).clear()
    ));
    await Promise.all(clearRequests);

    const storeData = validated.stores;
    const writeRequests = [
      ...storeData[SETTINGS_STORE].map(({ key, value }) => (
        transaction.objectStore(SETTINGS_STORE).put(value, key)
      )),
      ...BACKUP_STORE_NAMES
        .filter((storeName) => storeName !== SETTINGS_STORE)
        .flatMap((storeName) => storeData[storeName].map((record) => (
          transaction.objectStore(storeName).put(record)
        ))),
    ];
    await Promise.all(writeRequests);
    await transactionDone;

    return Object.fromEntries(
      BACKUP_STORE_NAMES.map((storeName) => [storeName, storeData[storeName].length]),
    );
  } catch (error) {
    try {
      transaction.abort();
    } catch {
      // The transaction may already have completed or aborted.
    }
    try {
      await transactionDone;
    } catch {
      // Consume the aborted transaction rejection before reporting the cause.
    }
    throw error;
  }
}
