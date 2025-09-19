import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.round(Math.random() * 1E9)
    const fileExtension = file.name.split('.').pop()
    const filename = `file-${timestamp}-${randomSuffix}.${fileExtension}`
    
    // Save file
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    // Return file URL
    const fileUrl = `/uploads/${filename}`
    
    console.log('File uploaded successfully:', {
      filename: filename,
      originalName: file.name,
      size: file.size,
      fileUrl: fileUrl
    })

    return NextResponse.json({ success: true, fileUrl })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json({ success: false, message: 'File upload failed' }, { status: 500 })
  }
}
