"use client";

import React from "react";
import Navbar from "@/components/layouts/Navbar";
import { PageContentWrapper } from "@/components/shared";
import P2PWorkbench from "@/components/p2p/P2PWorkbench";

export default function ProcurementPage() {
  return (
    <Navbar>
      <PageContentWrapper>
        <P2PWorkbench />
      </PageContentWrapper>
    </Navbar>
  );
}
