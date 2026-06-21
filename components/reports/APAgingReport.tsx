"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type APAgingData = {
  supplierId: string;
  supplierName: string;
  current: number;
  thirtyDays: number;
  sixtyDays: number;
  ninetyDays: number;
  older: number;
  total: number;
};

export default function APAgingReport() {
  const [data, setData] = useState<APAgingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch("/api/netsuite/reports/ap-aging");
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || "Failed to fetch AP aging report");
        }

        setData(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  if (loading) return <div className="p-4 text-center">Loading A/P Aging...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!data.length) return <div className="p-4 text-center text-muted-foreground">No outstanding vendor balances.</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/P Aging Summary</CardTitle>
        <CardDescription>Vendor balances by days overdue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-semibold">Supplier</th>
                <th className="pb-2 font-semibold text-right">Current</th>
                <th className="pb-2 font-semibold text-right">1-30 Days</th>
                <th className="pb-2 font-semibold text-right">31-60 Days</th>
                <th className="pb-2 font-semibold text-right">61-90 Days</th>
                <th className="pb-2 font-semibold text-right">&gt; 90 Days</th>
                <th className="pb-2 font-semibold text-right">Total Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.supplierId} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 font-medium">{row.supplierName}</td>
                  <td className="py-3 text-right">${row.current.toFixed(2)}</td>
                  <td className="py-3 text-right">${row.thirtyDays.toFixed(2)}</td>
                  <td className="py-3 text-right">${row.sixtyDays.toFixed(2)}</td>
                  <td className="py-3 text-right">${row.ninetyDays.toFixed(2)}</td>
                  <td className="py-3 text-right">${row.older.toFixed(2)}</td>
                  <td className="py-3 text-right font-bold">${row.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
