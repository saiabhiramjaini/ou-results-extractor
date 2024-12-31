import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

const fetchResult = async (htno: string) => {
  const formData = new URLSearchParams();
  formData.append("mbstatus", "SEARCH");
  formData.append("htno", htno);
  formData.append("Submit.x", "24");
  formData.append("Submit.y", "13");

  const config = {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };

  try {
    const response = await axios.post(
      "https://www.osmania.ac.in/res07/20250106.jsp",
      formData,
      config
    );

    const $ = cheerio.load(response.data);

    const hallTicketNo = $("td:contains('Hall Ticket No.')")
      .next()
      .text()
      .trim();

    const name = $("td:contains('Name')")
      .next()
      .text()
      .trim();

    const resultText = $("td:contains('Result with SGPA')")
      .parent()
      .next()
      .find("td:last-child")
      .text()
      .trim();

    const gpaMatch = resultText.match(/PASSED-(\d+\.\d+)/);
    const gpa = gpaMatch ? gpaMatch[1] : null;

    return { hallTicketNo, name, gpa };
  } catch (e: any) {
    console.error(`Error fetching result for HTNO ${htno}:`, e.message);
    return null;
  }
};

export async function POST(request: Request) {
  try {
    const { htno } = await request.json();

    // Check if htno is provided
    if (!htno) {
      return NextResponse.json(
        { error: "Missing htno in request body." },
        { status: 400 }
      );
    }

    // Validate the roll number
    if (htno.length !== 12 || isNaN(parseInt(htno))) {
      return NextResponse.json(
        { error: "Invalid roll number format." },
        { status: 400 }
      );
    }

    // Fetch the result for the given htno
    const result = await fetchResult(htno);

    if (!result) {
      return NextResponse.json(
        { error: "Unable to fetch result for the given roll number." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (e: any) {
    console.error("Error:", e.message);
    return NextResponse.json(
      { error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}

