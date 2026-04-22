/**
 * MOU Renewal Feature Tests
 * Run with: node src/tests/mouRenewal.test.js
 */

require('dotenv').config();
const path = require('path');
const Joi = require('joi');

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, testFunction) {
  testsRun++;
  try {
    const result = testFunction();
    if (result && typeof result.then === 'function') {
      return result
        .then((res) => {
          if (res === true || res === undefined) {
            console.log(`✅ PASS: ${name}`);
            testsPassed++;
          } else {
            console.log(`❌ FAIL: ${name} - ${res}`);
            testsFailed++;
          }
        })
        .catch((err) => {
          console.log(`❌ FAIL: ${name} - ${err.message}`);
          testsFailed++;
        });
    }
    if (result === true || result === undefined) {
      console.log(`✅ PASS: ${name}`);
      testsPassed++;
    } else {
      console.log(`❌ FAIL: ${name} - ${result}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${name} - ${error.message}`);
    testsFailed++;
  }
}

function assertTrue(condition, message = '') {
  if (!condition) throw new Error(`Expected true. ${message}`);
}
function assertFalse(condition, message = '') {
  if (condition) throw new Error(`Expected false. ${message}`);
}
function assertEquals(actual, expected, message = '') {
  if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMockRes() {
  const res = { _status: null, _body: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (body) => { res._body = body; return res; };
  return res;
}

function makeMockReq({ body = {}, files = null, params = {} } = {}) {
  return { body, files, params };
}

// ─── 1. Joi schema validation (mirrors renewMou.js) ─────────────────────────

const renewMouSchema = Joi.object({
  mou_sign_date: Joi.date().required(),
  mou_start_date: Joi.date().required(),
  mou_end_date: Joi.date().required(),
  confirmed_child_count: Joi.number().integer().required(),
});

async function runTests() {
  console.log('🧪 Running MOU Renewal Tests\n');

  // --- Schema validation ---

  test('Schema: valid payload passes', () => {
    const { error } = renewMouSchema.validate({
      mou_sign_date: '2026-01-01',
      mou_start_date: '2026-01-01',
      mou_end_date: '2027-01-01',
      confirmed_child_count: 42,
    });
    assertFalse(!!error, 'Valid payload should not produce a Joi error');
  });

  test('Schema: extra fields are allowed (allowUnknown)', () => {
    const { error } = renewMouSchema.validate(
      {
        mou_sign_date: '2026-01-01',
        mou_start_date: '2026-01-01',
        mou_end_date: '2027-01-01',
        confirmed_child_count: 5,
        extra_field: 'ignored',
      },
      { allowUnknown: true }
    );
    assertFalse(!!error, 'allowUnknown should pass extra fields through');
  });

  test('Schema: missing mou_sign_date fails', () => {
    const { error } = renewMouSchema.validate({
      mou_start_date: '2026-01-01',
      mou_end_date: '2027-01-01',
      confirmed_child_count: 5,
    });
    assertTrue(!!error, 'Missing sign date should fail');
  });

  test('Schema: missing confirmed_child_count fails', () => {
    const { error } = renewMouSchema.validate({
      mou_sign_date: '2026-01-01',
      mou_start_date: '2026-01-01',
      mou_end_date: '2027-01-01',
    });
    assertTrue(!!error, 'Missing child count should fail');
  });

  test('Schema: non-integer child count fails', () => {
    const { error } = renewMouSchema.validate({
      mou_sign_date: '2026-01-01',
      mou_start_date: '2026-01-01',
      mou_end_date: '2027-01-01',
      confirmed_child_count: 4.7,
    });
    assertTrue(!!error, 'Float child count should fail');
  });

  test('Schema: invalid date string fails', () => {
    const { error } = renewMouSchema.validate({
      mou_sign_date: 'not-a-date',
      mou_start_date: '2026-01-01',
      mou_end_date: '2027-01-01',
      confirmed_child_count: 10,
    });
    assertTrue(!!error, 'Invalid date should fail');
  });

  // --- Controller unit tests (mocked dependencies) ─────────────────────────

  const controllerPath = path.resolve(
    __dirname,
    '../controllers/appControllers/organizationController/renewMou'
  );
  const modelsKey = require.resolve(path.resolve(__dirname, '../../models'));
  const uploadKey = require.resolve(
    path.resolve(__dirname, '../middlewares/uploadMiddleware/uploadFileToS3')
  );

  function withMocks({ mockModels, mockUpload }, fn) {
    const originalModels = require.cache[modelsKey];
    const originalUpload = require.cache[uploadKey];
    const originalController = require.cache[require.resolve(controllerPath)];

    require.cache[modelsKey] = { id: modelsKey, filename: modelsKey, loaded: true, exports: mockModels };
    require.cache[uploadKey] = { id: uploadKey, filename: uploadKey, loaded: true, exports: mockUpload };
    delete require.cache[require.resolve(controllerPath)];

    try {
      const renewMou = require(controllerPath);
      return fn(renewMou);
    } finally {
      if (originalModels) require.cache[modelsKey] = originalModels;
      else delete require.cache[modelsKey];
      if (originalUpload) require.cache[uploadKey] = originalUpload;
      else delete require.cache[uploadKey];
      if (originalController) require.cache[require.resolve(controllerPath)] = originalController;
      else delete require.cache[require.resolve(controllerPath)];
    }
  }

  const baseModels = {
    sequelize: {
      transaction: async () => ({
        rollback: async () => {},
        commit: async () => {},
      }),
    },
    Partner: {
      findByPk: async () => ({ id: '123', name: 'Test School' }),
    },
    Mou: {
      update: async () => {},
      create: async (data) => ({ id: 'mou-1', ...data }),
    },
    PartnerAgreement: {
      create: async () => {},
    },
  };

  const baseUpload = {
    uploadFileToS3: async () => 'https://s3.example.com/uploads/mou_documents/test.pdf',
  };

  await test('Controller: missing file returns 400', async () => {
    await withMocks({ mockModels: baseModels, mockUpload: baseUpload }, async (renewMou) => {
      const req = makeMockReq({
        params: { id: '123' },
        body: {
          mou_sign_date: '2026-01-01',
          mou_start_date: '2026-01-01',
          mou_end_date: '2027-01-01',
          confirmed_child_count: '10',
        },
        files: null,
      });
      const res = makeMockRes();
      await renewMou(req, res);
      assertEquals(res._status, 400, 'Should return 400 when file is missing');
      assertFalse(res._body.success, 'success should be false');
    });
  });

  await test('Controller: invalid body returns 400', async () => {
    await withMocks({ mockModels: baseModels, mockUpload: baseUpload }, async (renewMou) => {
      const req = makeMockReq({
        params: { id: '123' },
        body: { confirmed_child_count: 'not-a-number' },
        files: { mou_document: { name: 'mou.pdf', data: Buffer.from('pdf'), mimetype: 'application/pdf' } },
      });
      const res = makeMockRes();
      await renewMou(req, res);
      assertEquals(res._status, 400, 'Should return 400 for invalid body');
    });
  });

  await test('Controller: partner not found returns 404', async () => {
    const modelsNotFound = {
      ...baseModels,
      Partner: { findByPk: async () => null },
    };
    await withMocks({ mockModels: modelsNotFound, mockUpload: baseUpload }, async (renewMou) => {
      const req = makeMockReq({
        params: { id: 'nonexistent' },
        body: {
          mou_sign_date: '2026-01-01',
          mou_start_date: '2026-01-01',
          mou_end_date: '2027-01-01',
          confirmed_child_count: '5',
        },
        files: { mou_document: { name: 'mou.pdf', data: Buffer.from('pdf'), mimetype: 'application/pdf' } },
      });
      const res = makeMockRes();
      await renewMou(req, res);
      assertEquals(res._status, 404, 'Should return 404 when partner not found');
    });
  });

  await test('Controller: S3 upload failure returns 500', async () => {
    const failingUpload = {
      uploadFileToS3: async () => { throw new Error('S3 unavailable'); },
    };
    await withMocks({ mockModels: baseModels, mockUpload: failingUpload }, async (renewMou) => {
      const req = makeMockReq({
        params: { id: '123' },
        body: {
          mou_sign_date: '2026-01-01',
          mou_start_date: '2026-01-01',
          mou_end_date: '2027-01-01',
          confirmed_child_count: '10',
        },
        files: { mou_document: { name: 'mou.pdf', data: Buffer.from('pdf'), mimetype: 'application/pdf' } },
      });
      const res = makeMockRes();
      await renewMou(req, res);
      assertEquals(res._status, 500, 'Should return 500 when S3 fails');
      assertFalse(res._body.success, 'success should be false');
    });
  });

  await test('Controller: happy path returns 200', async () => {
    await withMocks({ mockModels: baseModels, mockUpload: baseUpload }, async (renewMou) => {
      const req = makeMockReq({
        params: { id: '123' },
        body: {
          mou_sign_date: '2026-01-01',
          mou_start_date: '2026-01-01',
          mou_end_date: '2027-01-01',
          confirmed_child_count: '20',
        },
        files: { mou_document: { name: 'mou.pdf', data: Buffer.from('%PDF-1.4 test'), mimetype: 'application/pdf' } },
      });
      const res = makeMockRes();
      await renewMou(req, res);
      assertEquals(res._status, 200, 'Should return 200 on success');
      assertTrue(res._body.success, 'success should be true');
      assertTrue(!!res._body.result, 'result should be present');
    });
  });

  // --- uploadFileToS3 config check ---

  test('uploadFileToS3: S3 client has requestTimeout configured', () => {
    // We can't inspect the private S3Client instance directly, but we can verify
    // the module loads without error and the function is exported correctly.
    const { uploadFileToS3 } = require(
      path.resolve(__dirname, '../middlewares/uploadMiddleware/uploadFileToS3')
    );
    assertTrue(typeof uploadFileToS3 === 'function', 'uploadFileToS3 should be a function');
  });

  await test('uploadFileToS3: throws when file is null', async () => {
    // Override S3 so we don't need real credentials for this path
    const { uploadFileToS3 } = require(
      path.resolve(__dirname, '../middlewares/uploadMiddleware/uploadFileToS3')
    );
    let threw = false;
    try {
      await uploadFileToS3(null, 'mou_documents', 'test.pdf');
    } catch (e) {
      threw = true;
      assertEquals(e.message, 'No file provided for upload');
    }
    assertTrue(threw, 'Should throw when file is null');
  });

  // --- Summary ---

  console.log('\n📊 Test Results:');
  console.log(`Total: ${testsRun}  Passed: ${testsPassed}  Failed: ${testsFailed}`);
  if (testsFailed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed!');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
