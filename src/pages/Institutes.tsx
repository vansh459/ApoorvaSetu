import React, { useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, Clock, MapPin, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterInstitutesForUser } from '../services/rbacService';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  StatTile
} from '../components/ui';
import { Institute } from '../types';

export const Institutes: React.FC = () => {
  const { institutes } = useApp();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeInst, setActiveInst] = useState<Institute | null>(null);

  const scopedInsts = React.useMemo(() => {
    return filterInstitutesForUser(institutes, user);
  }, [institutes, user]);

  const filteredInsts = scopedInsts.filter((inst: Institute) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.code.toLowerCase().includes(search.toLowerCase()) ||
      inst.city.toLowerCase().includes(search.toLowerCase()) ||
      inst.state.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = selectedRegion === 'All' || inst.region === selectedRegion;
    const matchesCategory = selectedCategory === 'All' || inst.category === selectedCategory;

    return matchesSearch && matchesRegion && matchesCategory;
  });

  const totalInstitutes = scopedInsts.length;
  const approvedCount = scopedInsts.filter((i: Institute) => i.status === 'Approved').length;
  const pendingCount = scopedInsts.filter((i: Institute) => i.status === 'Pending Review').length;
  const noticeCount = scopedInsts.filter((i: Institute) => i.status === 'Notice Issued').length;

  const scoreTone = (score: number): 'success' | 'warning' | 'danger' =>
    score >= 90 ? 'success' : score >= 75 ? 'warning' : 'danger';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutes"
        description="Central registry of approved and applicant technical institutions across India."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total institutes" value={totalInstitutes} delta="Across 7 regions" icon={Building2} />
        <StatTile label="Approved and active" value={approvedCount} delta="Full compliance" icon={CheckCircle2} />
        <StatTile label="Under review" value={pendingCount} delta="EVC or scrutiny stage" icon={Clock} />
        <StatTile label="Notice issued" value={noticeCount} delta="Affidavit required" icon={AlertTriangle} />
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search institution, PID, city or state"
              aria-label="Search institutions"
              className="pl-9"
            />
          </div>

          <Select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Filter by region"
            className="md:w-48"
          >
            <option value="All">All regions</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
            <option value="Eastern">Eastern</option>
            <option value="Western">Western</option>
            <option value="Central">Central</option>
            <option value="North Eastern">North Eastern</option>
          </Select>

          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by discipline"
            className="md:w-56"
          >
            <option value="All">All disciplines</option>
            <option value="Engineering & Technology">Engineering & Technology</option>
            <option value="Management">Management</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Architecture">Architecture</option>
            <option value="Polytechnic">Polytechnic</option>
          </Select>
        </div>
      </Card>

      {filteredInsts.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No institutions match these filters"
            description="Clear the search or choose a different region or discipline."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredInsts.map((inst: Institute) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => setActiveInst(inst)}
              className="card-interactive flex flex-col justify-between rounded-card border border-line bg-surface p-5 text-left shadow-raise hover:border-line-strong"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Badge>AICTE PID: {inst.code}</Badge>
                  <StatusBadge status={inst.status} size="sm" />
                </div>

                <h3 className="text-sm font-semibold text-ink">{inst.name}</h3>

                <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                  <span>
                    {inst.city}, {inst.state} ({inst.region})
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2 border-t border-line pt-3 text-xs">
                  <div>
                    <span className="text-ink-2">Category</span>
                    <div className="font-medium leading-snug text-ink">{inst.category}</div>
                  </div>
                  <div>
                    <span className="text-ink-2">Approved seats</span>
                    <div className="font-medium text-ink">{inst.approvedSeats}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-2">Compliance health</span>
                  <span className="font-semibold text-ink">{inst.complianceScore}%</span>
                </div>
                <ProgressBar
                  value={inst.complianceScore}
                  tone={scoreTone(inst.complianceScore)}
                  label={`${inst.name} compliance health`}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(activeInst)}
        onClose={() => setActiveInst(null)}
        title={activeInst?.name ?? 'Institution'}
        subtitle={
          activeInst ? `Permanent ID ${activeInst.code}, established ${activeInst.establishedYear}` : undefined
        }
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setActiveInst(null)}>
            Close dossier
          </Button>
        }
      >
        {activeInst && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-control border border-line bg-surface-2 p-4 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs text-ink-2">Head of institution</span>
                <div className="mt-0.5 font-semibold text-ink">{activeInst.principalName}</div>
              </div>
              <div>
                <span className="text-xs text-ink-2">Jurisdiction</span>
                <div className="mt-0.5 font-medium text-ink">{activeInst.region} Regional Office</div>
              </div>
              <div>
                <span className="text-xs text-ink-2">Official email</span>
                <div className="mt-0.5 font-medium text-accent">{activeInst.email}</div>
              </div>
              <div>
                <span className="text-xs text-ink-2">Contact number</span>
                <div className="mt-0.5 font-medium text-ink">{activeInst.phone}</div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-ink-2">Registered campus address</span>
                <div className="mt-0.5 text-ink">{activeInst.address}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
              <div className="rounded-control border border-line p-3">
                <div className="text-xl font-semibold text-ink">{activeInst.approvedSeats}</div>
                <div className="mt-0.5 text-xs text-ink-2">Annual student intake</div>
              </div>
              <div className="rounded-control border border-line p-3">
                <div className="text-xl font-semibold text-ink">{activeInst.accreditedPrograms}</div>
                <div className="mt-0.5 text-xs text-ink-2">NBA accredited courses</div>
              </div>
              <div className="rounded-control border border-line p-3">
                <div className="text-xl font-semibold text-ink">{activeInst.complianceScore}%</div>
                <div className="mt-0.5 text-xs text-ink-2">Compliance rating</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
