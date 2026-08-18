"use client";

import { Car, MapPin, Package as PackageIcon, Sparkles } from "lucide-react";
import { useState } from "react";

import { AdminPage } from "@/components/admin/admin-page";
import { AddOnsManager } from "@/components/admin/master-data/addons-manager";
import { JeepsManager } from "@/components/admin/master-data/jeeps-manager";
import { MeetingPointsManager } from "@/components/admin/master-data/meeting-points-manager";
import { PackagesManager } from "@/components/admin/master-data/packages-manager";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";

type TabType = "addons" | "packages" | "jeeps" | "meeting_points";

const sections: SegmentedOption<TabType>[] = [
  { value: "addons", label: "Layanan Add-On", icon: Sparkles },
  { value: "packages", label: "Paket Tour", icon: PackageIcon },
  { value: "jeeps", label: "Armada Jeep", icon: Car },
  { value: "meeting_points", label: "Titik Kumpul", icon: MapPin },
];

export function MasterDataClient() {
  const [activeTab, setActiveTab] = useState<TabType>("addons");

  return (
    <AdminPage
      title="Kelola Master Data"
      description="Kelola data layanan tambahan, paket tour, armada jeep, dan titik kumpul."
      width="wide"
    >
      <SegmentedControl
        label="Kategori master data"
        options={sections}
        value={activeTab}
        onChange={setActiveTab}
        className="border-b border-border pb-4"
      />

      {activeTab === "addons" ? <AddOnsManager /> : null}
      {activeTab === "packages" ? <PackagesManager /> : null}
      {activeTab === "jeeps" ? <JeepsManager /> : null}
      {activeTab === "meeting_points" ? <MeetingPointsManager /> : null}
    </AdminPage>
  );
}
