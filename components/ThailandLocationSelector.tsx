'use client';

import { useState, useEffect } from 'react';

interface LocationData {
  province: string;
  districts: { [key: string]: string[] };
}

interface ThailandLocationSelectorProps {
  onLocationChange: (location: {
    province: string;
    district: string;
    subdistrict: string;
    postcode?: string;
  }) => void;
  selectedLocation?: {
    province?: string;
    district?: string;
    subdistrict?: string;
    postcode?: string;
  };
  disabled?: boolean;
}

// Sample Thailand location data (in a real app, this would come from an API)
const THAILAND_LOCATIONS: LocationData[] = [
  {
    province: "กรุงเทพมหานคร",
    districts: {
      "เขตบางกะปิ": ["หนองบอน", "บางกะปิ", "คลองจั่น", "หนองจอก", "ลาดพร้าว"],
      "เขตบางเขน": ["อนุสาวรีย์", "แสนแสบ", "บางเขน", "ทุ่งสองห้อง"],
      "เขตบางคอแหลม": ["บางคอแหลม", "วัดพระยาไกร", "บางโพ"],
      "เขตบางซื่อ": ["บางซื่อ", "วงศ์ทองหลาง", "บางแสน"],
      "เขตดินแดง": ["ดินแดง", "สามเสนใน", "สามเสนนอก"],
      "เขตดุสิต": ["ดุสิต", "วชิรพยาบาล", "สวนจตุจักร", "สี่แยกมหานาค"],
      "เขตห้วยขวาง": ["ห้วยขวาง", "บางกะปิ", "สุทธิสาร"],
      "เขตคลองเตย": ["คลองเตย", "คลองตัน", "พระโขนง"],
      "เขตสาทร": ["สีลม", "สุริยวงศ์", "บางรัก", "ทุ่งมหาเมฆ"],
      "เขตปทุมวัน": ["ปทุมวัน", "ลุมพินี", "รองเมือง", "วังใหม่"]
    }
  },
  {
    province: "เชียงใหม่",
    districts: {
      "เมืองเชียงใหม่": ["ศรีภูมิ", "พระสิงห์", "หายยา", "ช้างม่อย", "วัดเกต"],
      "แม่ริม": ["แม่ริม", "ไผ่แดง", "สบแม่ข่า", "หนองหาร"],
      "หางดง": ["หางดง", "หนองแก๋ว", "บ้านวารี"],
      "สารภี": ["สารภี", "ชมภู", "ไชยสถาน", "ท่าสาย"],
      "ดอยสะเก็ด": ["ดอยสะเก็ด", "ลวงเหนือ", "สุเทพ"]
    }
  },
  {
    province: "ขอนแก่น",
    districts: {
      "เมืองขอนแก่น": ["ในเมือง", "บ้านเป็ด", "ศิลา", "บ้านทุ่ม"],
      "หนองสองห้อง": ["หนองสองห้อง", "โสกนกเต็น", "นาข่า"],
      "บ้านฝาง": ["บ้านฝาง", "โนนเพ็ก", "หัวหนา"],
      "ชุมแพ": ["ชุมแพ", "นาเซียว", "บ้านเพิ่ม"]
    }
  },
  {
    province: "ภูเก็ต",
    districts: {
      "เมืองภูเก็ต": ["ตลาดใหญ่", "ตลาดเหนือ", "กะทู้", "ฉลอง", "รัษฎา"],
      "กะทู้": ["กะทู้", "กมลา", "ป่าตอง"],
      "ถลาง": ["ถลาง", "เชิงทะเล", "ศรีสุนทร", "ไม้ขาว"]
    }
  },
  {
    province: "สงขลา",
    districts: {
      "เมืองสงขลา": ["บ่อยาง", "เขารูปช้าง", "พะวง", "กะแสร์"],
      "หาดใหญ่": ["หาดใหญ่", "ข่าพิ", "คลองหาด", "ท่าข้าม"],
      "สะเดา": ["สะเดา", "ป่าดัง", "บ่อแฮ้ว"]
    }
  }
];

// Thailand postal codes mapping (sample data)
const POSTAL_CODE_MAP: { [key: string]: string } = {
  "กรุงเทพมหานคร": "10xxx",
  "เชียงใหม่": "50xxx",
  "ขอนแก่น": "40xxx",
  "ภูเก็ต": "83xxx",
  "สงขลา": "90xxx"
};

export default function ThailandLocationSelector({
  onLocationChange,
  selectedLocation,
  disabled = false
}: ThailandLocationSelectorProps) {
  const [selectedProvince, setSelectedProvince] = useState(selectedLocation?.province || '');
  const [selectedDistrict, setSelectedDistrict] = useState(selectedLocation?.district || '');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState(selectedLocation?.subdistrict || '');
  const [manualPostcode, setManualPostcode] = useState(selectedLocation?.postcode || '');
  const [useManualPostcode, setUseManualPostcode] = useState(false);

  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableSubdistricts, setAvailableSubdistricts] = useState<string[]>([]);

  // Update districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      const provinceData = THAILAND_LOCATIONS.find(p => p.province === selectedProvince);
      if (provinceData) {
        setAvailableDistricts(Object.keys(provinceData.districts));
        setSelectedDistrict('');
        setSelectedSubdistrict('');
        setAvailableSubdistricts([]);
      }
    } else {
      setAvailableDistricts([]);
      setAvailableSubdistricts([]);
    }
  }, [selectedProvince]);

  // Update subdistricts when district changes
  useEffect(() => {
    if (selectedProvince && selectedDistrict) {
      const provinceData = THAILAND_LOCATIONS.find(p => p.province === selectedProvince);
      if (provinceData && provinceData.districts[selectedDistrict]) {
        setAvailableSubdistricts(provinceData.districts[selectedDistrict]);
        setSelectedSubdistrict('');
      }
    } else {
      setAvailableSubdistricts([]);
    }
  }, [selectedProvince, selectedDistrict]);

  // Notify parent component when location changes
  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedSubdistrict) {
      const postcode = useManualPostcode ? manualPostcode : POSTAL_CODE_MAP[selectedProvince] || '';
      onLocationChange({
        province: selectedProvince,
        district: selectedDistrict,
        subdistrict: selectedSubdistrict,
        postcode
      });
    }
  }, [selectedProvince, selectedDistrict, selectedSubdistrict, manualPostcode, useManualPostcode, onLocationChange]);

  const handlePostcodeToggle = () => {
    setUseManualPostcode(!useManualPostcode);
    if (!useManualPostcode) {
      setManualPostcode('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Province Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จังหวัด (Province) *
          </label>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            disabled={disabled}
            className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">เลือกจังหวัด</option>
            {THAILAND_LOCATIONS.map((location) => (
              <option key={location.province} value={location.province}>
                {location.province}
              </option>
            ))}
          </select>
        </div>

        {/* District Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            อำเภอ/เขต (District)
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={disabled || !selectedProvince}
            className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          >
            <option value="">เลือกอำเภอ/เขต</option>
            {availableDistricts.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>

        {/* Subdistrict Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ตำบล/แขวง (Subdistrict)
          </label>
          <select
            value={selectedSubdistrict}
            onChange={(e) => setSelectedSubdistrict(e.target.value)}
            disabled={disabled || !selectedDistrict}
            className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          >
            <option value="">เลือกตำบล/แขวง</option>
            {availableSubdistricts.map((subdistrict) => (
              <option key={subdistrict} value={subdistrict}>
                {subdistrict}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Postcode Section */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="manualPostcode"
            checked={useManualPostcode}
            onChange={handlePostcodeToggle}
            disabled={disabled}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="manualPostcode" className="text-sm text-gray-700">
            ใส่รหัสไปรษณีย์เอง (Manual postcode entry)
          </label>
        </div>

        {useManualPostcode ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รหัสไปรษณีย์ (Postcode)
            </label>
            <input
              type="text"
              value={manualPostcode}
              onChange={(e) => setManualPostcode(e.target.value)}
              disabled={disabled}
              placeholder="เช่น 10400"
              pattern="[0-9]{5}"
              maxLength={5}
              className="w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
          </div>
        ) : (
          selectedProvince && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                รหัสไปรษณีย์ (Auto-generated)
              </label>
              <input
                type="text"
                value={POSTAL_CODE_MAP[selectedProvince] || ''}
                disabled
                className="w-full border-gray-300 rounded-md bg-gray-100 text-gray-500"
              />
            </div>
          )
        )}
      </div>

      {/* Location Summary */}
      {selectedProvince && selectedDistrict && selectedSubdistrict && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-green-800 mb-1">ที่อยู่ที่เลือก:</h4>
          <p className="text-sm text-green-700">
            {selectedSubdistrict}, {selectedDistrict}, {selectedProvince}
            {(useManualPostcode ? manualPostcode : POSTAL_CODE_MAP[selectedProvince]) && 
              ` ${useManualPostcode ? manualPostcode : POSTAL_CODE_MAP[selectedProvince]}`
            }
          </p>
        </div>
      )}
    </div>
  );
}