import { openDB } from 'idb';

const DATABASE_NAME = 'rezel-local';
const DATABASE_VERSION = 3;
const SETTINGS_STORE = 'settings';
const CUSTOMERS_STORE = 'customers';
const SERVICES_STORE = 'services';
const APPOINTMENTS_STORE = 'appointments';
const PAYMENTS_STORE = 'payments';
const BUSINESS_TYPE_KEY = 'businessType';

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

function requireDate(value) {
  const date = requireText(value, 'Appointment date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError('Appointment date must use YYYY-MM-DD format.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new TypeError('Appointment date is invalid.');
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
  const appointmentDate = requireDate(date);
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
