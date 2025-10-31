import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/bulk-health-stats/import - Import CSV data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const csvFile = formData.get('csvFile') as File;
    const sourceReference = formData.get('sourceReference') as string;

    if (!csvFile) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      );
    }

    // Read CSV content
    const csvContent = await csvFile.text();
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least a header and one data row' },
        { status: 400 }
      );
    }

    // Parse CSV header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate required columns
    const requiredColumns = ['province', 'diseasetype', 'casecount', 'reportdate'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}. Required: ${requiredColumns.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse data rows
    const dataRows = lines.slice(1);
    const records = [];
    const errors = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const values = row.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 2}: Column count mismatch`);
        continue;
      }

      // Create record object
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index];
      });

      // Validate and transform data
      try {
        const transformedRecord = {
          province: record.province,
          district: record.district || null,
          subdistrict: record.subdistrict || null,
          postcode: record.postcode || null,
          latitude: record.latitude ? parseFloat(record.latitude) : null,
          longitude: record.longitude ? parseFloat(record.longitude) : null,
          diseaseType: record.diseasetype,
          caseCount: parseInt(record.casecount),
          populationCount: record.populationcount ? parseInt(record.populationcount) : null,
          severity: record.severity || null,
          ageGroup: record.agegroup || null,
          gender: record.gender || null,
          reportDate: new Date(record.reportdate),
          periodType: record.periodtype || 'DAILY',
          sourceType: 'CSV_IMPORT',
          sourceReference: sourceReference || csvFile.name,
          reportedBy: userId,
          notes: record.notes || null
        };

        // Validate required fields
        if (!transformedRecord.province || !transformedRecord.diseaseType || 
            isNaN(transformedRecord.caseCount) || isNaN(transformedRecord.reportDate.getTime())) {
          errors.push(`Row ${i + 2}: Invalid or missing required data`);
          continue;
        }

        if (transformedRecord.caseCount < 0) {
          errors.push(`Row ${i + 2}: Case count must be positive`);
          continue;
        }

        records.push(transformedRecord);
      } catch (error) {
        errors.push(`Row ${i + 2}: Data parsing error - ${error}`);
      }
    }

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No valid records found to import', errors },
        { status: 400 }
      );
    }

    // Import records to database
    let successCount = 0;
    let failCount = 0;
    const importErrors = [];

    for (let i = 0; i < records.length; i++) {
      try {
        await prisma.bulkHealthStatistic.create({
          data: records[i]
        });
        successCount++;
      } catch (error) {
        failCount++;
        importErrors.push(`Record ${i + 1}: Database error - ${error}`);
      }
    }

    return NextResponse.json({
      message: 'CSV import completed',
      summary: {
        totalRows: dataRows.length,
        successCount,
        failCount,
        validationErrors: errors.length,
        importErrors: importErrors.length
      },
      errors: [...errors, ...importErrors].slice(0, 50) // Limit error messages
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV data' },
      { status: 500 }
    );
  }
}