# OU Results Extractor

A web application built with Next.js and TypeScript for extracting and analyzing student results from Osmania University. This tool allows faculty and administrators to efficiently fetch results for multiple students and download them in various formats.

![OU Results Extractor](https://github.com/user-attachments/assets/87da1d77-ea14-4913-8e74-6d4783e3668d)


## 🌟 Features

### Core Functionality
- **Bulk Results Fetching**: Fetch results for multiple students using roll number ranges
- **Real-time Processing**: View results as they are being fetched
- **Smart Error Handling**: Graceful handling of network issues and invalid roll numbers
- **Data Validation**: Automatic validation of 12-digit roll numbers

### Results Display
- **Interactive Table View**: Clean and organized presentation of results
- **Color-coded SGPA**: Visual indicators for different grade ranges
  - Green: 9.0 and above
  - Blue: 8.0 to 8.99
  - Yellow: 7.0 to 7.99
  - Orange: Below 7.0
  - Red: Failed/Absent
- **Detailed Student Information**: Comprehensive view of each student's details

### Export Options
- **Excel Export**: Download results in XLSX format with all student details
- **PDF Export**: Generate professional PDF reports of results

### User Interface
- **Modern UI**: Built with shadcn/ui components for a polished look
- **Intuitive Layout**: Easy-to-use interface with clear instructions

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework for production-grade applications
- **TypeScript**: For type-safe code and better development experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: High-quality UI components built on Radix UI

### Libraries
- **xlsx**: For Excel file generation
- **jspdf & jspdf-autotable**: For PDF document creation
- **file-saver**: For handling file downloads
- **cheerio**: For parsing HTML responses

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/saiabhiramjaini/results-extractor.git
```



2. Install dependencies:


```shellscript
cd results-extractor
npm install
```

3. Start the development server:


```shellscript
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser


## 🚀 Usage

1. **Enter Roll Number Range**

- Input the starting roll number
- Input the ending roll number
- Both must be 12 digits



2. **Provide Results URL**

- Enter the Osmania University results page URL



3. **Fetch Results**

- Click "Fetch Results" to begin extraction
- Monitor progress in real-time



4. **View and Export**

- Review results in the table
- Click "More Info" for detailed student information
- Download results in Excel or PDF format





## 🏗️ Project Structure

```plaintext
results-extractor/
├── app/
│   ├── api/
│   │   └── results/
│   │       └── route.ts    # API endpoint for fetching results
│   ├── student-results.tsx # Main component
│   └── page.tsx           # Root page
├── components/
    └── ui/               # shadcn/ui components

```

## 🧩 Key Components

### API Route (`app/api/results/route.ts`)

- Handles POST requests for result fetching
- Implements cheerio for HTML parsing
- Includes error handling and response formatting


### Student Results Component (`app/student-results.tsx`)

- Manages state for roll numbers and results
- Implements file download functionality
- Handles UI rendering and user interactions


## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit changes: `git commit -m 'Add YourFeature'`
4. Push to branch: `git push origin feature/YourFeature`
5. Submit a pull request

## 📞 Contact

Sai Abhiram Jaini - [@saiabhiramjaini](https://github.com/saiabhiramjaini)

Project Link: [https://github.com/saiabhiramjaini/results-extractor](https://github.com/saiabhiramjaini/results-extractor)

---

Built by [Sai Abhiram Jaini](https://github.com/saiabhiramjaini)
