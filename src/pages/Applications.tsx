import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, ArrowUpDown, Eye, FileText, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterApplicationsForUser, hasPermission } from '../services/rbacService';
import { StatusBadge } from '../components/common/StatusBadge';
import { ApplicationStage, Region } from '../types';
import { APPLICATION_TYPE_OPTIONS } from '../workflow/routes';
import { OPERATIONAL_STAGES, STAGE_META, canonicalStage } from '../workflow/stages';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  Input,
  Notice,
  PageHeader,
  Select,
  type DataTableColumn
} from '../components/ui';

type ApplicationRow = ReturnType<typeof filterApplicationsForUser>[number];

export const Applications: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialStage = searchParams.get('stage') || 'All';
  const initialStatus = searchParams.get('status') || 'All';
  const initialRegion = searchParams.get('region') || 'All';

  const { applications, setSelectedApplication, setActiveModal, addNewApplication } = useApp();

  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState(initialRegion);
  const [selectedStage, setSelectedStage] = useState(initialStage);
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);

  // Synchronize state with URL parameters when navigating with browser back/forward buttons
  React.useEffect(() => {
    const stage = searchParams.get('stage') || 'All';
    const status = searchParams.get('status') || 'All';
    const region = searchParams.get('region') || 'All';
    setSelectedStage(stage);
    setSelectedStatus(status);
    setSelectedRegion(region);
  }, [searchParams]);
  const [sortField, setSortField] = useState<'id' | 'instituteName' | 'lastUpdated'>('lastUpdated');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // New application quick form state
  const [isCreating, setIsCreating] = useState(false);
  const [newInstName, setNewInstName] = useState('');
  const [newRegion, setNewRegion] = useState<Region>('Northern');
  const [newType, setNewType] = useState('Extension of Approval (EoA)');
  const [newIntake, setNewIntake] = useState(300);

  const { user } = useAuth();
  const canCreateApplication = hasPermission(user, 'applications.create');

  const scopedApps = useMemo(() => {
    return filterApplicationsForUser(applications, user);
  }, [applications, user]);

  const filteredApps = useMemo(() => {
    return scopedApps
      .filter((app) => {
        const matchesSearch =
          app.id.toLowerCase().includes(search.toLowerCase()) ||
          app.instituteName.toLowerCase().includes(search.toLowerCase()) ||
          app.type.toLowerCase().includes(search.toLowerCase());

        const matchesRegion = selectedRegion === 'All' || app.region === selectedRegion;
        const matchesStage =
          selectedStage === 'All' ||
          canonicalStage(app.stage) === canonicalStage(selectedStage as ApplicationStage);
        const matchesStatus = selectedStatus === 'All' || app.status === selectedStatus;

        return matchesSearch && matchesRegion && matchesStage && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (sortAsc) {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  }, [scopedApps, search, selectedRegion, selectedStage, selectedStatus, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredApps.length / pageSize) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstName) return;
    addNewApplication({
      instituteName: newInstName,
      region: newRegion,
      type: newType,
      intakeProposed: newIntake
    });
    setNewInstName('');
    setIsCreating(false);
  };

  const columns: DataTableColumn<ApplicationRow>[] = [
    {
      key: 'id',
      header: 'Application',
      render: (app) => (
        <div className="min-w-0">
          <div className="font-medium text-accent">{app.id}</div>
          <div className="text-xs text-ink-2">{app.type}</div>
        </div>
      )
    },
    {
      key: 'institute',
      header: 'Institution',
      render: (app) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{app.instituteName}</div>
          <div className="text-xs text-ink-2">Intake {app.intakeProposed} seats</div>
        </div>
      )
    },
    {
      key: 'region',
      header: 'Region',
      cellClassName: 'whitespace-nowrap',
      render: (app) => <span className="text-ink-2">{app.region}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (app) => (
        <div className="space-y-1">
          <StatusBadge status={app.status} size="sm" />
          <div className="text-xs text-ink-2">{app.stage}</div>
        </div>
      )
    },
    {
      key: 'updated',
      header: 'Last updated',
      cellClassName: 'whitespace-nowrap',
      render: (app) => <span className="text-ink-2">{app.lastUpdated}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (app) => (
        <div className="inline-flex items-center gap-1.5">
          <IconButton
            label={`Open case summary for ${app.id}`}
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedApplication(app);
              setActiveModal('case-summary');
            }}
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          </IconButton>
          <Button
            size="sm"
            variant="secondary"
            icon={<Eye className="h-3.5 w-3.5" strokeWidth={1.75} />}
            onClick={() => {
              setSelectedApplication(app);
              setActiveModal('app-detail');
            }}
          >
            Inspect
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        description="Every institutional application with its current stage, scrutiny and approval status."
        actions={
          canCreateApplication && (
            <Button icon={<Plus className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setIsCreating(true)}>
              New application
            </Button>
          )
        }
      />

      {user?.role === 'REGIONAL_OFFICER' && (
        <Notice tone="warning" title="Regional officer scope">
          Restricted to <strong className="font-semibold">{user.region} Region</strong> jurisdiction (
          {scopedApps.length} applications).
        </Notice>
      )}

      {user?.role === 'INSTITUTION_ADMIN' && (
        <Notice tone="info" title="Institutional scope">
          Showing submissions for <strong className="font-semibold">{user.instituteName}</strong>{' '}
          ({user.instituteId}).
        </Notice>
      )}

      {isCreating && canCreateApplication && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Register a new application</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Field label="Institution name" htmlFor="new-inst-name" className="sm:col-span-2">
              <Input
                id="new-inst-name"
                type="text"
                required
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
                placeholder="Apex Institute of Technology"
              />
            </Field>

            <Field label="Region" htmlFor="new-region">
              <Select
                id="new-region"
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value as Region)}
              >
                <option value="Northern">Northern</option>
                <option value="Southern">Southern</option>
                <option value="Eastern">Eastern</option>
                <option value="Western">Western</option>
                <option value="Central">Central</option>
                <option value="North Eastern">North Eastern</option>
              </Select>
            </Field>

            <Field label="Application type" htmlFor="new-type">
              <Select id="new-type" value={newType} onChange={(e) => setNewType(e.target.value)}>
                {APPLICATION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Proposed intake" htmlFor="new-intake" className="sm:col-span-1">
              <Input
                id="new-intake"
                type="number"
                value={newIntake}
                onChange={(e) => setNewIntake(Number(e.target.value))}
              />
            </Field>

            <div className="flex items-end justify-end gap-2 sm:col-span-3">
              <Button variant="secondary" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit application</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
              strokeWidth={1.75}
            />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by application ID or institution"
              aria-label="Filter applications"
              className="pl-9"
            />
          </div>

          <Select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Filter by region"
            className="md:w-44"
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
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            aria-label="Filter by stage"
            className="md:w-56"
          >
            <option value="All">All stages</option>
            {OPERATIONAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_META[stage].label}
              </option>
            ))}
          </Select>

          <Select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filter by status"
            className="md:w-44"
          >
            <option value="All">All statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Action Required">Action Required</option>
            <option value="Approved">Approved</option>
            <option value="Returned">Returned</option>
            <option value="Rejected">Rejected</option>
          </Select>

          {(selectedRegion !== 'All' || selectedStage !== 'All' || selectedStatus !== 'All' || search) && (
            <IconButton
              label="Reset filters"
              variant="secondary"
              onClick={() => {
                setSelectedRegion('All');
                setSelectedStage('All');
                setSelectedStatus('All');
                setSearch('');
              }}
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
            </IconButton>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-2">
          <span>
            Showing <span className="font-semibold text-ink">{filteredApps.length}</span> applications
          </span>
          <Button
            variant="link"
            onClick={() => {
              setSortField('lastUpdated');
              setSortAsc(!sortAsc);
            }}
            icon={<ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.75} />}
          >
            Sort by date
          </Button>
        </div>
      </Card>

      {paginatedApps.length === 0 ? (
        <Card padded="none">
          <EmptyState
            icon={FileText}
            title="No applications match"
            description="Adjust the filters or start a new application."
            action={
              canCreateApplication && (
                <Button size="sm" onClick={() => setIsCreating(true)}>
                  New application
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <>
          <ul className="space-y-2 md:hidden">
            {paginatedApps.map((app) => (
              <li
                key={app.id}
                className="rounded-card border border-line bg-surface p-4 shadow-raise"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-accent">{app.id}</p>
                    <p className="truncate text-sm text-ink">{app.instituteName}</p>
                    <p className="mt-0.5 text-xs text-ink-2">
                      {app.type}, {app.region} Region
                    </p>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-xs text-ink-2">
                  <span>
                    {app.stage}, updated {app.lastUpdated}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedApplication(app);
                      setActiveModal('app-detail');
                    }}
                  >
                    Inspect
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable
              caption="Institutional applications with stage, status and available actions"
              columns={columns}
              rows={paginatedApps}
              rowKey={(app) => app.id}
              minWidth="900px"
            />
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-ink-2">
            Page <span className="font-semibold text-ink">{currentPage}</span> of{' '}
            <span className="font-semibold text-ink">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                type="button"
                onClick={() => setCurrentPage(i + 1)}
                aria-current={currentPage === i + 1 ? 'page' : undefined}
                className={`h-9 w-9 rounded-control text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  currentPage === i + 1
                    ? 'bg-action text-white'
                    : 'border border-line bg-surface text-ink-2 hover:bg-surface-2'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
