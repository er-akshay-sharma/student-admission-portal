import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getStudents from '@salesforce/apex/StudentAdmissionController.getStudents';
import saveStudent from '@salesforce/apex/StudentAdmissionController.saveStudent';
import importStudents from '@salesforce/apex/StudentAdmissionController.importStudents';
import getFiles from '@salesforce/apex/StudentAdmissionController.getFiles';

export default class StudentAdmissionPortal extends NavigationMixin(LightningElement) {
   @track student = {};
   @track students = [];
   @track files = [];

   recordId;

   columns = [
       { label: 'Name', fieldName: 'Name' },
       { label: 'Course', fieldName: 'Course__c' },
       { label: 'Age', fieldName: 'Age__c' },
       { label: 'Fees', fieldName: 'Fees__c' },
       { label: 'Email', fieldName: 'Email__c' }
   ];

   courseOptions = [
       { label: 'Salesforce', value: 'Salesforce' },
       { label: 'Java', value: 'Java' },
       { label: 'Python', value: 'Python' }
   ];

   @wire(getStudents)
   wiredStudents({ data }) {
       if (data) {
           this.students = data;
       }
   }

   get showCertificate() {
       return this.student.Course__c === 'Salesforce';
   }

   handleChange(event) {
       this.student = {
           ...this.student,
           [event.target.dataset.field]: event.target.value
       };
   }

   handleCheckbox(event) {
       this.student = {
           ...this.student,
           [event.target.dataset.field]: event.target.checked
       };
   }

   saveRecord() {
       saveStudent({ student: this.student })
           .then(result => {
               this.recordId = result.Id;
               this.student = result;
               this.showToast('Success', 'Student saved successfully', 'success');
               return getStudents();
           })
           .then(data => {
               this.students = data;
           })
           .catch(error => {
               this.showToast('Error', error.body.message, 'error');
           });
   }

   handleUpload() {
       this.showToast('Success', 'File uploaded successfully', 'success');
       this.loadFiles();
   }

   loadFiles() {
       getFiles({ recordId: this.recordId })
           .then(data => {
               this.files = data;
           })
           .catch(error => {
               this.showToast('Error', error.body.message, 'error');
           });
   }

   previewFile(event) {
       const contentDocumentId = event.target.dataset.id;

       this[NavigationMixin.Navigate]({
           type: 'standard__namedPage',
           attributes: {
               pageName: 'filePreview'
           },
           state: {
               selectedRecordId: contentDocumentId
           }
       });
   }

   handleCSV(event) {
       const file = event.target.files[0];

       if (!file) {
           return;
       }

       const reader = new FileReader();

       reader.onload = () => {
           const csv = reader.result;
           const rows = csv.split('\n').filter(row => row.trim() !== '');
           const students = [];

           for (let i = 1; i < rows.length; i++) {
               const cols = rows[i].split(',');

               students.push({
                   Name: cols[0],
                   Course__c: cols[1],
                   Fees__c: Number(cols[2]),
                   Age__c: Number(cols[3]),
                   Email__c: cols[4]
               });
           }

           importStudents({ students })
               .then(() => {
                   this.showToast('Success', 'CSV imported successfully', 'success');
                   return getStudents();
               })
               .then(data => {
                   this.students = data;
               })
               .catch(error => {
                   this.showToast('Error', error.body.message, 'error');
               });
       };

       reader.readAsText(file);
   }

   exportCSV() {
       let csv = 'Name,Course,Fees,Age,Email\n';

       this.students.forEach(row => {
           csv += `${row.Name},${row.Course__c},${row.Fees__c},${row.Age__c},${row.Email__c}\n`;
       });

       const element = document.createElement('a');
       element.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
       element.download = 'students.csv';
       document.body.appendChild(element);
       element.click();
       document.body.removeChild(element);
   }

   showToast(title, message, variant) {
       this.dispatchEvent(
           new ShowToastEvent({
               title,
               message,
               variant
           })
       );
   }
}
