import { NextRequest, NextResponse } from "next/server";
import * as cheerio from 'cheerio';

interface StudentResult {
  status: 'FOUND' | 'NOT_FOUND';
  message?: string;
  personalDetails?: {
    hallTicketNo: string;
    name: string;
    fatherName: string;
    gender: string;
    course: string;
  };
  marks?: Array<{
    subCode: string;
    subjectName: string;
    credits: string;
    gradePoints: string;
    gradeSecurity: string;
  }>;
  result?: {
    semester: string;
    sgpa: string;
    cgpa: string;
  };
}

function cleanName(fullName: string, fatherName: string): string {
  let cleanedName = fullName.replace(/Credits/g, '').trim();
  
  if (fatherName && cleanedName.endsWith(fatherName)) {
    cleanedName = cleanedName.slice(0, -fatherName.length).trim();
  }
  
  return cleanedName;
}

export async function POST(req: NextRequest) {
  try {
    const { url, htno } = await req.json();

    if (!url || !htno) {
      return NextResponse.json(
        { message: "URL and hall ticket number are required" },
        { status: 400 }
      );
    }

    const formData = new URLSearchParams();
    formData.append("mbstatus", "SEARCH");
    formData.append("htno", htno);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const notFoundText = $('font:contains("Is Not Found")').text();
    if (notFoundText) {
      return NextResponse.json({
        data: {
          status: 'NOT_FOUND',
          message: `Hall Ticket Number "${htno}" is not found.`
        },
        status: 404
      });
    }

    const studentResult: StudentResult = {
      status: 'FOUND',
    };

    const personalDetailsTable = $('#AutoNumber3');
    if (personalDetailsTable.length) {
      const fatherName = personalDetailsTable
        .find('td:contains("Father")')
        .next()
        .find('font')
        .text()
        .trim();

      const rawName = personalDetailsTable
        .find('td:contains("Name")')
        .next()
        .find('font')
        .text()
        .trim();

      const cleanedName = cleanName(rawName, fatherName);

      studentResult.personalDetails = {
        hallTicketNo: personalDetailsTable.find('td:contains("Hall Ticket No.")').next().find('font').text().trim(),
        name: cleanedName,
        fatherName: fatherName,
        gender: personalDetailsTable.find('td:contains("Gender")').next().find('font').text().trim(),
        course: personalDetailsTable.find('td:contains("Course")').next().find('font').text().trim(),
      };
    }

    const marksTable = $('#AutoNumber4');
    if (marksTable.length) {
      const marks: StudentResult['marks'] = [];
      $('table#AutoNumber4 tr').each((i, elem) => {
        if (i > 1) {
          const tds = $(elem).find('td');
          if (tds.length === 5) {
            marks.push({
              subCode: $(tds[0]).text().trim(),
              subjectName: $(tds[1]).text().trim(),
              credits: $(tds[2]).text().trim(),
              gradePoints: $(tds[3]).text().trim(),
              gradeSecurity: $(tds[4]).text().trim(),
            });
          }
        }
      });
      studentResult.marks = marks;
    }

    const resultTable = $('#AutoNumber5');
    if (resultTable.length) {
      const resultRows = $('table#AutoNumber5 tr');
      let lastValidRow;
      for (let i = resultRows.length - 1; i >= 0; i--) {
        const row = resultRows.eq(i);
        if (row.find('td').first().text().trim()) {
          lastValidRow = row;
          break;
        }
      }
      
      if (lastValidRow) {
        studentResult.result = {
          semester: lastValidRow.find('td').eq(0).text().trim(),
          sgpa: lastValidRow.find('td').eq(1).text().trim(),
          cgpa: lastValidRow.find('td').eq(2).text().trim(),
        };
      }
    }

    return NextResponse.json({
      data: studentResult,
      status: 200,
    });

  } catch (e: any) {
    console.error("Error:", e.message);
    
    if (e.name === 'AbortError') {
      return NextResponse.json(
        { message: "Request timed out", error: e.message },
        { status: 408 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to fetch results", error: e.message },
      { status: 500 }
    );
  }
}

