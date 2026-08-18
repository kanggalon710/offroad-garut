import { describe, expect, it } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { createCallerFactory } from "@/server/trpc";

const createCaller = createCallerFactory(appRouter);
const caller = createCaller({ db: null, headers: new Headers(), user: null } as never);

describe("Admin Master Data & Add-On Services CRUD", () => {
  it("menyediakan prosedur CRUD add-on services di router admin", () => {
    expect(typeof caller.admin.getAddOns).toBe("function");
    expect(typeof caller.admin.createAddOn).toBe("function");
    expect(typeof caller.admin.updateAddOn).toBe("function");
    expect(typeof caller.admin.deleteAddOn).toBe("function");
  });

  it("menyediakan prosedur CRUD paket, jeep, dan titik kumpul di router admin", () => {
    expect(typeof caller.admin.getPackages).toBe("function");
    expect(typeof caller.admin.createPackage).toBe("function");
    expect(typeof caller.admin.updatePackage).toBe("function");
    expect(typeof caller.admin.deletePackage).toBe("function");
    expect(typeof caller.admin.getJeepsAdmin).toBe("function");
    expect(typeof caller.admin.createJeep).toBe("function");
    expect(typeof caller.admin.updateJeep).toBe("function");
    expect(typeof caller.admin.deleteJeep).toBe("function");
    expect(typeof caller.admin.getMeetingPointsAdmin).toBe("function");
    expect(typeof caller.admin.createMeetingPoint).toBe("function");
    expect(typeof caller.admin.updateMeetingPoint).toBe("function");
    expect(typeof caller.admin.deleteMeetingPoint).toBe("function");
  });

  it("menyediakan prosedur publik getAddOnServices di router booking", () => {
    expect(typeof caller.booking.getAddOnServices).toBe("function");
  });
});
