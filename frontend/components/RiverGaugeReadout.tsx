"use client";

import { useEffect, useState } from "react";

type GaugeValue = { label: string; value: string; unit: string; observedAt: string };

export function RiverGaugeReadout({ siteId }: { siteId: string }) {
  const [values, setValues] = useState<GaugeValue[]>([]);
  const [status, setStatus] = useState("Loading current USGS reading…");

  useEffect(() => {
    const controller = new AbortController();
    const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${siteId}&parameterCd=00060,00065&siteStatus=all`;
    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Gauge unavailable");
        return response.json();
      })
      .then((payload) => {
        const readings: GaugeValue[] = (payload?.value?.timeSeries ?? []).flatMap((series: any) => {
          const latest = series?.values?.[0]?.value?.at(-1);
          if (!latest) return [];
          const code = series?.variable?.variableCode?.[0]?.value;
          return [{
            label: code === "00060" ? "Discharge" : code === "00065" ? "Gauge height" : series?.variable?.variableDescription,
            value: latest.value,
            unit: series?.variable?.unit?.unitCode ?? "",
            observedAt: latest.dateTime,
          }];
        });
        setValues(readings);
        setStatus(readings.length ? "USGS provisional real-time data" : "No current reading reported");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setStatus("Current reading unavailable");
      });
    return () => controller.abort();
  }, [siteId]);

  return (
    <div className="river-gauge-readout">
      {values.map((reading) => (
        <p key={reading.label}>
          <strong>{reading.label}:</strong> {Number(reading.value).toLocaleString()} {reading.unit}
          <small>{new Date(reading.observedAt).toLocaleString()}</small>
        </p>
      ))}
      <small>{status}. A reading alone does not establish safe paddling conditions.</small>
    </div>
  );
}
