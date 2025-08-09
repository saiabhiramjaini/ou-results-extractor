import { NextRequest, NextResponse } from "next/server";
import { load } from 'cheerio';

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
    // Disable SSL verification for external requests
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";
    
    const { url, htno } = await req.json();

    // Input validation
    if (!url || !htno) {
      return NextResponse.json(
        { message: "URL and hall ticket number are required" },
        { status: 400 }
      );
    }

    // Validate hall ticket number format (12 digits)
    if (!/^\d{12}$/.test(htno)) {
      return NextResponse.json(
        { message: "Hall ticket number must be exactly 12 digits" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { message: "Invalid URL format" },
        { status: 400 }
      );
    }

    const formData = new URLSearchParams();
    formData.append("mbstatus", "SEARCH");
    formData.append("htno", htno);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 20000); // 20 seconds timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      body: formData.toString(),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Basic HTML validation
    if (!html || html.length < 100) {
      throw new Error('Invalid response received from server');
    }
    
    const $ = load(html);

    // Check for "not found" message
    const notFoundText = $('font:contains("Is Not Found")').text();
    if (notFoundText) {
      return NextResponse.json({
        data: {
          status: 'NOT_FOUND',
          message: `Hall Ticket Number "${htno}" is not found.`
        }
      }, { status: 200 });
    }

    const studentResult: StudentResult = {
      status: 'FOUND',
    };

    // Extract personal details
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

    // Extract marks
    const marksTable = $('#AutoNumber4');
    if (marksTable.length) {
      const marks: StudentResult['marks'] = [];
      $('table#AutoNumber4 tr').each((i: number, elem: any) => {
        if (i > 1) { // Skip header rows
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

    // Extract result
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
    if (e.name === 'AbortError') {
      return NextResponse.json(
        { message: "Request timed out. Please try again later." },
        { status: 408 }
      );
    }
    
    if (e.message?.includes('fetch failed') || e.message?.includes('network')) {
      return NextResponse.json(
        { message: "Network error. Please check your connection and try again." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { message: "Unable to fetch results. Please try again later." },
      { status: 500 }
    );
  }
}

