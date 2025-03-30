import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Resume } from '@/app/dashboard/resume/[resumeId]/edit/page';

interface ResumePDFProps {
  resume: Resume | null;
  templateName: 'classic' | 'modern' | 'minimal' | 'professional';
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 5,
  },
  text: {
    fontSize: 10,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  listItem: {
    marginBottom: 5,
  }
});

const ResumePDFDocument: React.FC<ResumePDFProps> = ({ resume }) => {
  if (!resume) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>{resume.resumeName}</Text>
          {resume.contact?.email && (
            <Text style={styles.subtitle}>{resume.contact.email}</Text>
          )}
          {resume.contact?.phone && (
            <Text style={styles.subtitle}>{resume.contact.phone}</Text>
          )}
          {resume.contact?.location && (
            <Text style={styles.subtitle}>{resume.contact.location}</Text>
          )}
        </View>

        {/* Summary Section */}
        {resume.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.text}>{resume.summary}</Text>
          </View>
        )}

        {/* Experience Section */}
        {resume.experience && resume.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.experience.map((exp, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.subtitle}>{exp.jobTitle} at {exp.company}</Text>
                <Text style={styles.text}>{exp.startDate} - {exp.endDate}</Text>
                <Text style={styles.text}>{exp.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Education Section */}
        {resume.education && resume.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((edu, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.subtitle}>{edu.degree}</Text>
                <Text style={styles.text}>{edu.schoolName}</Text>
                <Text style={styles.text}>{edu.startDate} - {edu.endDate}</Text>
                {edu.notes && <Text style={styles.text}>{edu.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Skills Section */}
        {resume.skills && resume.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.text}>{resume.skills.join(', ')}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ResumePDFDocument; 