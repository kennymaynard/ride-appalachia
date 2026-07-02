"use client";

import { FormEvent, useMemo, useState } from "react";
import { createTrailConditionReport } from "../lib/api";
import type { TrailConditionReport, TrailInfo } from "../lib/types";

type Props = {
  areaSlug: string;
  areaName: string;
  trails: TrailInfo[];
  reports: TrailConditionReport[];
};

const reportTypes: Array<{ value: TrailConditionReport["reportType"]; label: string }> = [
  { value: "muddy", label: "Muddy" },
  { value: "dusty", label: "Dusty" },
  { value: "closed", label: "Closed" },
  { value: "washed_out", label: "Washed out" },
  { value: "downed_tree", label: "Downed tree" },
  { value: "weak_cell", label: "Weak cell signal" },
  { value: "trailer_warning", label: "Trailer parking warning" },
  { value: "crowded", label: "Crowded" },
  { value: "clear", label: "Clear" },
];

const severityLabels: Record<TrailConditionReport["severity"], string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  closed: "Closed",
};

function formatReportType(value: TrailConditionReport["reportType"]) {
  return reportTypes.find((type) => type.value === value)?.label ?? value.replaceAll("_", " ");
}

export function TrailConditionReports({ areaSlug, areaName, trails, reports }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recentReports = useMemo(() => reports.slice(0, 6), [reports]);

  function useCurrentLocation() {
    setError("");
    setLocationStatus("");
    if (!navigator.geolocation) {
      setLocationStatus("Location is not available on this device.");
      return;
    }

    setLocationStatus("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("Location attached to this report.");
      },
      () => setLocationStatus("Location permission was not allowed."),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    );
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await createTrailConditionReport({
        areaSlug,
        trailName: String(formData.get("trailName") || "").trim(),
        riderName: String(formData.get("riderName") || "").trim() || "Rider report",
        reportType: String(formData.get("reportType") || "muddy") as TrailConditionReport["reportType"],
        severity: String(formData.get("severity") || "moderate") as TrailConditionReport["severity"],
        note: String(formData.get("note") || "").trim(),
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      });
      setSubmitted(true);
      setCoordinates(null);
      setLocationStatus("");
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to submit condition report.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="trail-condition-reports" id="trail-conditions">
      <div className="section-heading">
        <p>Rider conditions</p>
        <h2>Report what riders need to know at {areaName}</h2>
      </div>

      <div className="condition-report-layout">
        <article className="condition-report-summary">
          <strong>{reports.length}</strong>
          <span>Approved reports</span>
          <p>Recent rider updates show on the map after admin approval.</p>
          <div className="condition-report-pills">
            {reportTypes.slice(0, 7).map((type) => (
              <small key={type.value}>{type.label}</small>
            ))}
          </div>
        </article>

        <div className="condition-report-list">
          {recentReports.length ? (
            recentReports.map((report) => (
              <article key={report.id}>
                <div>
                  <strong>{formatReportType(report.reportType)}</strong>
                  <span>{severityLabels[report.severity]}</span>
                </div>
                <p>{report.note || `${areaName} rider condition update.`}</p>
                <small>
                  {report.trailName || areaName}
                  {report.riderName ? ` - ${report.riderName}` : ""}
                </small>
              </article>
            ))
          ) : (
            <p className="empty-state">No approved condition reports yet.</p>
          )}
        </div>

        <form className="review-form condition-report-form" onSubmit={submitReport}>
          <div>
            <p className="eyebrow">Report conditions</p>
            <h3>Help riders avoid surprises.</h3>
          </div>
          <label>
            Rider name
            <input name="riderName" placeholder="Your name or group" />
          </label>
          <label>
            Trail or area
            <select defaultValue="" name="trailName">
              <option value="">{areaName}</option>
              {trails.map((trail) => (
                <option key={trail.name} value={trail.name}>
                  {trail.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Report type
            <select required defaultValue="muddy" name="reportType">
              {reportTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select required defaultValue="moderate" name="severity">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label>
            Note
            <textarea name="note" placeholder="Where is it, how bad is it, and what should riders know?" />
          </label>
          <button className="secondary-button" type="button" onClick={useCurrentLocation}>
            Use My Location
          </button>
          {locationStatus ? <p className="form-hint">{locationStatus}</p> : null}
          {submitted ? (
            <p className="form-success">Condition report submitted. It will show after admin approval.</p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Condition"}
          </button>
        </form>
      </div>
    </section>
  );
}
