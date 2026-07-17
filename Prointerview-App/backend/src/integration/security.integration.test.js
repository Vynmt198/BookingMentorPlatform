import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import {
  applyTestEnv,
  startMongoHarness,
  stopMongoHarness,
  startHttpServer,
  stopHttpServer,
  mintAccessToken,
} from "../test_helpers/mongoTestHarness.js";

applyTestEnv();

let harness;
let http;
let User;
let createApp;

before(async () => {
  harness = await startMongoHarness();
  ({ User } = await import("../models/User.js"));
  ({ createApp } = await import("../app.js"));
  http = await startHttpServer(createApp());
});

after(async () => {
  if (http?.server) await stopHttpServer(http.server);
  if (harness) await stopMongoHarness(harness);
});

function authHeaders(user) {
  return { Authorization: `Bearer ${mintAccessToken(user._id)}` };
}

describe("Security integration", () => {
  it("chặn payload login kiểu NoSQL injection", async () => {
    const res = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        email: { $ne: "" },
        password: "anything",
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it("khóa tạm thời sau nhiều lần brute-force login sai", async () => {
    const plain = "Correct#123";
    const passwordHash = await bcrypt.hash(plain, 10);
    const user = await User.create({
      name: "Bruteforce Tester",
      email: `brute-${Date.now()}@test.local`,
      passwordHash,
      role: "customer",
    });

    for (let i = 0; i < 5; i++) {
      const wrong = await fetch(`${http.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: user.email, password: "wrong-pass" }),
      });
      assert.equal(wrong.status, 401);
    }

    const blocked = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: user.email, password: "wrong-pass" }),
    });
    assert.equal(blocked.status, 429);
  });

  it("logout blacklist access token jti ngay lập tức", async () => {
    const plain = "LogoutJti#123";
    const passwordHash = await bcrypt.hash(plain, 10);
    const user = await User.create({
      name: "JTI Logout",
      email: `jti-logout-${Date.now()}@test.local`,
      passwordHash,
      role: "customer",
    });

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: user.email, password: plain }),
    });
    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    const token = loginBody.token;
    assert.ok(token);

    const meBefore = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    assert.equal(meBefore.status, 200);

    const logoutRes = await fetch(`${http.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    assert.equal(logoutRes.status, 200);

    const meAfter = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    assert.equal(meAfter.status, 401);
  });

  it("refresh rotation blacklist access token jti cũ", async () => {
    const plain = "RefreshJti#123";
    const passwordHash = await bcrypt.hash(plain, 10);
    const user = await User.create({
      name: "JTI Refresh",
      email: `jti-refresh-${Date.now()}@test.local`,
      passwordHash,
      role: "customer",
    });

    const loginRes = await fetch(`${http.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: user.email, password: plain }),
    });
    const loginBody = await loginRes.json();
    const oldToken = loginBody.token;
    const refreshToken = loginBody.refreshToken;
    assert.ok(oldToken);
    assert.ok(refreshToken);

    const refreshRes = await fetch(`${http.baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${oldToken}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
    assert.equal(refreshRes.status, 200);
    const refreshBody = await refreshRes.json();
    assert.ok(refreshBody.token);
    assert.notEqual(refreshBody.token, oldToken);

    const meOld = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${oldToken}`, Accept: "application/json" },
    });
    assert.equal(meOld.status, 401);

    const meNew = await fetch(`${http.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${refreshBody.token}`, Accept: "application/json" },
    });
    assert.equal(meNew.status, 200);
  });

  it("route admin/mentor từ chối user sai quyền", async () => {
    const customer = await User.create({
      name: "Customer Role",
      email: `role-${Date.now()}@test.local`,
      role: "customer",
    });

    const adminNoAuth = await fetch(`${http.baseUrl}/api/admin/stats`);
    assert.equal(adminNoAuth.status, 401);

    const adminForbidden = await fetch(`${http.baseUrl}/api/admin/stats`, {
      headers: authHeaders(customer),
    });
    assert.equal(adminForbidden.status, 403);

    const mentorForbidden = await fetch(`${http.baseUrl}/api/mentor/dashboard`, {
      headers: authHeaders(customer),
    });
    assert.equal(mentorForbidden.status, 403);
  });
});
