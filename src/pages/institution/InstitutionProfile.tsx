import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea
} from '../../components/ui';

export const InstitutionProfile: React.FC = () => {
  const { showToast } = useApp();

  const [name, setName] = useState('ABC Institute of Technology');
  const [code, setCode] = useState('1-102938475');
  const [pid, setPid] = useState('INST-101');
  const [category, setCategory] = useState('Engineering & Technology');
  const [estYear, setEstYear] = useState('2004');
  const [principalName, setPrincipalName] = useState('Dr. K. S. Murthy');
  const [email, setEmail] = useState('principal@abctech.edu.in');
  const [phone, setPhone] = useState('+91 512 2589001');
  const [address, setAddress] = useState('Sector 14, Institutional Area, Kalyanpur, Kanpur, Uttar Pradesh - 208016');
  const [approvedSeats, setApprovedSeats] = useState('480');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Institution profile updated and submitted for AICTE master directory synchronization', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institution profile"
        description="Verified campus information, the permanent identification number and the authorised signatories held in the AICTE directory."
        meta={
          <>
            <Badge tone="info">Institution admin</Badge>
            <Badge tone="success">AICTE approved</Badge>
          </>
        }
      />

      <form onSubmit={handleSave} className="space-y-6">
        <Card padded="none">
          <CardHeader
            title="Primary identification"
            description="Legal name, permanent identifiers and academic category."
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field
              label="Institution legal name"
              htmlFor="institution-name"
              required
              className="sm:col-span-2"
            >
              <Input
                id="institution-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field
              label="Permanent AICTE institute ID (PID)"
              htmlFor="institution-pid"
              hint="Assigned by AICTE and cannot be edited."
            >
              <Input id="institution-pid" type="text" value={pid} disabled className="font-mono" />
            </Field>

            <Field
              label="AICTE application reference"
              htmlFor="institution-code"
              hint="Assigned by AICTE and cannot be edited."
            >
              <Input id="institution-code" type="text" value={code} disabled className="font-mono" />
            </Field>

            <Field label="Discipline or category" htmlFor="institution-category">
              <Select
                id="institution-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Management">Management</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Architecture">Architecture</option>
                <option value="Polytechnic">Polytechnic</option>
              </Select>
            </Field>

            <Field label="Year of establishment" htmlFor="institution-est-year">
              <Input
                id="institution-est-year"
                type="text"
                value={estYear}
                onChange={(e) => setEstYear(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <Card padded="none">
          <CardHeader
            title="Head of institution"
            description="The principal or director who signs statutory submissions on behalf of the campus."
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Principal or director full name" htmlFor="institution-principal" required>
              <Input
                id="institution-principal"
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                required
              />
            </Field>

            <Field label="Official institutional email" htmlFor="institution-email" required>
              <Input
                id="institution-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Authorised phone" htmlFor="institution-phone">
              <Input
                id="institution-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>

            <Field label="Approved annual intake" htmlFor="institution-intake">
              <Input
                id="institution-intake"
                type="text"
                value={approvedSeats}
                onChange={(e) => setApprovedSeats(e.target.value)}
              />
            </Field>

            <Field
              label="Registered campus address"
              htmlFor="institution-address"
              className="sm:col-span-2"
            >
              <Textarea
                id="institution-address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" icon={<Save className="h-4 w-4" />}>
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
};
