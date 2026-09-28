public with sharing class StudentAdmissionController {
   @AuraEnabled(cacheable=true)
   public static List<Student__c> getStudents() {
       return [
           SELECT Id, Name, Course__c, Fees__c, Age__c, Email__c, Certification_Required__c
           FROM Student__c
           ORDER BY CreatedDate DESC
           LIMIT 200
       ];
   }

   @AuraEnabled
   public static Student__c saveStudent(Student__c student) {
       validateStudent(student);
       upsert student;
       return student;
   }

   @AuraEnabled
   public static void importStudents(List<Student__c> students) {
       for (Student__c s : students) {
           validateStudent(s);
       }
       insert students;
   }

   @AuraEnabled(cacheable=true)
   public static List<ContentDocumentLink> getFiles(Id recordId) {
       return [
           SELECT ContentDocumentId, ContentDocument.Title, ContentDocument.FileType
           FROM ContentDocumentLink
           WHERE LinkedEntityId = :recordId
           ORDER BY ContentDocument.CreatedDate DESC
       ];
   }

   private static void validateStudent(Student__c student) {
       Student_Config__mdt config = Student_Config__mdt.getInstance('Default');

       if (config == null) {
           throw new AuraHandledException('Student configuration missing.');
       }

       if (student.Age__c < config.Minimum_Age__c) {
           throw new AuraHandledException('Minimum age should be ' + config.Minimum_Age__c);
       }

       if (student.Fees__c > config.Maximum_Fees__c) {
           throw new AuraHandledException('Maximum fees allowed is ' + config.Maximum_Fees__c);
       }

       if (
           String.isNotBlank(config.Allowed_Courses__c) &&
           !config.Allowed_Courses__c.contains(student.Course__c)
       ) {
           throw new AuraHandledException('Course is not allowed.');
       }
   }

}